import { FC, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { io, Socket } from "socket.io-client";
import Peer, { SignalData } from "simple-peer";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import streamSaver from "streamsaver";
import FileDetails from "./FileDetails";
import Spinner from "../shared/Spinner";
import RoomHeader from "./RoomHeader";
import FileDownload from "./FileDownload";
import useMessages from "../../hooks/useMessages";
import fetchWithTimeout from "../../utils/fetchWithTimeout";

// web workers
const arrayBufferWorker = new Worker("../arrayBufferWorker.js");
const blobChunkWorker = new Worker("../blobChunkWorker.js");

const Room: FC = () => {
  // states
  const [totalUsers, setTotalUsers] = useState<number>(1);
  const [file, setFile] = useState<File>();
  const [recievedFile, setRecievedFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [fileSize, setFileSize] = useState<null | string>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [sending, setSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // refs
  const socketRef = useRef<Socket<DefaultEventsMap, DefaultEventsMap>>();
  const peersRef = useRef<{ peer: Peer.Instance; id: string }[]>([]);
  const fileNameRef = useRef<string>("");
  const inputRef = useRef<null | HTMLInputElement>(null);
  const sendingRef = useRef<{ [key: string]: boolean }>({});
  const recievingRef = useRef(false);
  const senderRef = useRef<string | null>(null);
  const recievingMessageRef = useRef("");
  const { messages, addMessage, removeMessage } = useMessages();
  const navigate = useNavigate();
  const roomID = useParams().roomID;
  const state = useLocation().state as any;

  useEffect(() => {
    setLoading(true);
    // validate roomID & check for space in room
    fetchWithTimeout("/api/rooms", { timeout: 25000 })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          console.log("an error occurred...");
          setError("An error occurred!");
        }
      })
      .then((rooms: any) => {
        if (!rooms) throw new Error("Unable to reach server");
        const inputRoomID = roomID?.trim();
        const includesRoomID =
          inputRoomID && Object.keys(rooms).includes(inputRoomID);

        if (
          inputRoomID &&
          ((includesRoomID && rooms[inputRoomID]?.length < 4) ||
            state?.fromCreateRoom)
        ) {
          // valid roomID & available space in room
          setLoading(false);
          socketRef.current = io("/", {
            reconnection: true,
            reconnectionAttempts: 5,
          });
          socketRef.current.on("connect", () => {
            socketRef.current?.emit("join-room", { roomID });
          });

          socketRef.current.on("disconnect", () => {
            peersRef.current = [];
            navigate("/");
          });

          socketRef.current.io.on('reconnect_failed', () => {
            console.log('reconnect failed...');
            socketRef.current?.disconnect();
          });

          socketRef.current.io.on('reconnect', () => {
            console.log('reconnecting...');
          });

          socketRef.current.on("total-users", (totalUsers: number) => {
            setTotalUsers(totalUsers);
          });

          socketRef.current.on("all-users", (users) => {
            for (let user of users) {
              const peer = createPeer(user, socketRef.current?.id ?? "");
              peersRef.current.push({ peer, id: user });
            }
          });

          socketRef.current.on("user-joined", (payload) => {
            const peer = addPeer(payload.signal, payload.callerID);
            peersRef.current = [
              ...peersRef.current,
              {
                peer,
                id: payload.callerID,
              },
            ];
          });

          socketRef.current.on("user-left", (userId) => {
            handlePeerLeave(userId);
          });

          socketRef.current.on("recieving-signal", (payload) => {
            const obj = peersRef.current.find((peer) => peer.id === payload.id);
            obj?.peer.signal(payload.signal);
            setConnected(true);
          });

          socketRef.current.on("file-recieved", (userId) => {
            if (socketRef.current) sendingRef.current[userId] = false;
            if (Object.values(sendingRef.current).every((v) => !v)) {
              // done sending to all users
              peersRef.current.forEach(({ peer }) =>
                peer?.write(JSON.stringify({ doneSharing: true }))
              );
              sendingRef.current = {};
              setSending(false);
            }

            addMessage({
              type: "message",
              message: (
                <p className="text-md text-success">
                  User{" "}
                  {peersRef.current.findIndex(({ id }) => id === userId) + 1}{" "}
                  recieved file
                </p>
              ),
              persist: true,
              timeout: 10000,
            });
          });
        } else {
          // full room or invalid roomID
          navigate(
            {
              pathname: "/",
              search: `?roomID=${roomID}&roomFull=${includesRoomID}`,
            },
            { replace: true }
          );
        }
      })
      .catch((err) => {
        setLoading(false);
        console.log("an error occurred: ", err.message);
        if (err.name === "AbortError") {
          setError("Network error!");
        } else {
          setError(err.message);
        }
      });

    return () => {
      // clean up
      peersRef.current = [];
      socketRef?.current?.disconnect();
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.files && setFile(e.target.files[0]);
  };

  // handle peer recieving data
  const handleRecieveData = (data: any) => {
    if (data.toString().includes("sendingFile")) {
      senderRef.current = JSON.parse(data).sendingFile;

      // recieving file message
      recievingMessageRef.current = addMessage({
        type: "message",
        message: (
          <div className="w-full flex align-center justify-center text-muted text-xs">
            <span className="mr-0-5">recieving file</span>
            <Spinner full={false} />
          </div>
        ),
        persist: true,
        allowRemove: false,
      });
      recievingRef.current = true;
    } else if (data.toString().includes("sharingFile")) {
      recievingRef.current = true;
    } else if (data.toString().includes("doneSharing")) {
      recievingRef.current = false;
    } else {
      if (data.toString().includes("done")) {
        // file ready for download
        setRecievedFile(true);
        removeMessage(recievingMessageRef.current);
        recievingRef.current = false;

        socketRef.current?.emit("file-recieved", senderRef.current);

        const parsed = JSON.parse(data);
        fileNameRef.current = parsed.fileName;
        // byte to megabyte
        setFileSize((Number(parsed.fileSize) / (1024 * 1024)).toFixed(2));

        addMessage({
          type: "message",
          message: (
            <div className="flex align-center justify-between">
              <span className="text-md">You recieved a file!</span>
              <span
                className="link text-xs ml-0-5"
                onClick={() => setModalOpen(true)}
              >
                see details
              </span>
            </div>
          ),
          persist: true,
          timeout: 10000,
        });
      } else {
        arrayBufferWorker.postMessage(data); // send chunks to worker to convert to array buffer
      }
    }
  };

  // handle file download
  const handleDownload = () => {
    arrayBufferWorker.postMessage("download"); // send back generated buffer from worker
    arrayBufferWorker.addEventListener(
      "message",
      (e) => {
        // download file
        const stream = e.data.stream();
        const fileStream = streamSaver.createWriteStream(fileNameRef.current);
        stream.pipeTo(fileStream);
      },
      { once: true }
    );
  };

  // create peer
  const createPeer = (userToSignal: string, callerID: string) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          /*{ urls: ['stun:stun.l.google.com:19302'] }*/
          {
            urls: "stun:openrelay.metered.ca:80",
          },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
    });

    peer.on("signal", (signal) => {
      socketRef?.current?.emit("sending-signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    peer.on("data", handleRecieveData);

    peer.on("error", (error) => {
      console.log("peer error: ", error);
      handlePeerLeave(callerID);
    });

    return peer;
  };

  // add peer
  const addPeer = (incomingSignal: SignalData, callerID: string) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      config: {
        iceServers: [
          /*{ urls: ['stun:stun.l.google.com:19302'] }*/
          {
            urls: "stun:openrelay.metered.ca:80",
          },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
    });

    peer.on("signal", (signal) => {
      socketRef?.current?.emit("returning-signal", { signal, callerID });
      Object.values(sendingRef.current).some((v) => v) &&
        peer?.write(JSON.stringify({ sharingFile: socketRef.current?.id }));
      setConnected(true);
    });

    peer.on("data", handleRecieveData);

    peer.on("error", (error) => {
      console.log("peer error: ", error);
      handlePeerLeave(callerID);
    });

    peer.signal(incomingSignal);

    return peer;
  };

  const handlePeerLeave = (id: string) => {
    if (peersRef.current.map(({ id }) => id).includes(id)) {
      setTotalUsers((prev) => prev - 1);
      peersRef.current = peersRef.current.filter(
        ({ id: userId }) => userId !== id
      );

      if (recievingRef.current && senderRef.current === id) {
        recievingRef.current = false;
        removeMessage(recievingMessageRef.current);

        peersRef.current.forEach(({ peer }) =>
          peer?.write(JSON.stringify({ doneSharing: true }))
        );

        addMessage({
          type: "error",
          message: "An error occurred!",
          persist: true,
          timeout: 7500,
        });
      }
      if (Object.values(sendingRef.current).filter((v) => v).length === 1 &&
        Object.keys(sendingRef.current)[0] === id) {
        setSending(false);
        sendingRef.current = {};

        peersRef.current.forEach(({ peer }) =>
          peer?.write(JSON.stringify({ doneSharing: true }))
        );

        addMessage({
          type: "error",
          message: "An error occurred!",
          persist: true,
          timeout: 7500,
        });
      }
      if (sendingRef.current[id]) sendingRef.current[id] = false;
    }
  };

  // handle sending file
  const sendFile = () => {
    if (!recievingRef.current || !sendingRef.current) {
      if (file) {
        setSending(true);

        // blob -> blob chunks
        blobChunkWorker.postMessage(file);
        blobChunkWorker.addEventListener(
          "message",
          async (e: MessageEvent) => {
            // blob chunks
            const fileChunks = e.data;

            for (let { peer, id } of peersRef.current) {
              sendingRef.current[id] = true;
              // send files to peers asynchronously
              new Promise<void>(async () => {
                console.log("sending to: ", id);
                peer?.write(
                  JSON.stringify({ sendingFile: socketRef.current?.id })
                );

                for (let i = 0; i < fileChunks.length; i++) {
                  const fileChunk = fileChunks[i];
                  const fileStream: any = fileChunk.stream();
                  const reader = fileStream.getReader();

                  const handleReading = async (done: boolean, value: any) => {
                    if (done) {
                      i === fileChunks.length - 1 &&
                        peer?.write(
                          JSON.stringify({
                            done: true,
                            fileName: file.name,
                            fileSize: file.size.toFixed(2),
                          })
                        );
                      return;
                    }

                    sendingRef.current[id] && peer?.write(value);
                    if (!sendingRef.current[id]) return;

                    const { value: newValue, done: newDone } =
                      await reader.read();
                    handleReading(newDone, newValue);
                  };

                  // start read
                  const { value, done } = await reader.read();
                  handleReading(done, value);
                }

                console.log("end: ", id);
              });
            }
          },
          { once: true }
        );
      } else {
        // no file selected
        addMessage({
          type: "error",
          message: "Please select a file",
          timeout: 5000,
        });
      }
    } else {
      recievingRef.current &&
        addMessage({
          type: "message",
          message: "A user is sharing a file, hold on ️🤚",
          timeout: 5000,
        });
    }
  };

  return (
    <>
      {!loading && !error && (
        <div
          className="Room w-full flex flex-column align-center justify-start
              text-secondary"
        >
          <RoomHeader
            roomID={roomID}
            totalUsers={totalUsers}
            addMessage={addMessage}
          />
          {/* select file field when connection is established */}
          <div className="w-full mt-4-75 mb-4-75 flex align-center justify-center">
            {connected && totalUsers > 1 ? (
              <div className="flex flex-column align-center justify-center">
                <div className="input-container mb-1">
                  <input
                    ref={inputRef}
                    type="file"
                    className="p-0-75 text-muted"
                    onChange={handleFileSelect}
                  />
                  {/* placeholder */}
                  <span className="placeholder text-muted text-sm">
                    {file
                      ? file.name.length > 17
                        ? `${file.name.slice(0, 15)}...${file.name.slice(
                          file.name.lastIndexOf(".")
                        )}`
                        : file.name
                      : "Click to select a file 📂"}
                  </span>
                </div>
                <button
                  className="flex align-center bg-mutedAlt px-1 py-1-5 text-dark text-md"
                  style={{
                    backgroundColor: sending ? "#dededee6" : "#dedede",
                    height: "63px",
                    width: "158px",
                  }}
                  onClick={sendFile}
                  disabled={sending}
                >
                  {sending ? (
                    <span className="w-full flex align-center justify-center text-muted text-md">
                      <span className="mr-0-5">sending</span>
                      <Spinner full={false} />
                    </span>
                  ) : (
                    <>
                      Share file
                      <FontAwesomeIcon
                        icon={faShareNodes}
                        size="lg"
                        className="ml-0-75"
                      />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-md text-mutedAlt text-center">
                Copy and share the roomID to start sharing files...
              </p>
            )}
          </div>
          {/* messages */}
          {messages.map(({ message, id: messageId, type, allowRemove }, i) => {
            const offset = messages
              .slice(0, i)
              .map(() => 6.5)
              .reduce((prev, curr): any => prev + curr, 0);
            return (
              <div
                key={messageId}
                className="message-container w-full flex justify-center"
                style={{
                  bottom: `${10 + offset}px`,
                }}
              >
                <div
                  className={`message w-fit bg-secondary flex align-center justify-space-between
                  ${type === "error" ? "text-error" : "text-muted"
                    } text-md px-1 py-0-75`}
                >
                  {message}
                  {allowRemove && (
                    <button
                      className="close bg-white h-fit text-dark text-md ml-1"
                      onClick={() => {
                        removeMessage(messageId);
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} className="bg-white" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {recievedFile && <FileDownload setDownloadModal={setModalOpen} />}
          <FileDetails
            handleDownload={handleDownload}
            name={fileNameRef.current}
            size={fileSize}
            open={modalOpen}
            setOpen={setModalOpen}
          />
        </div>
      )}
      {
        <div className="h-full w-full flex align-center justify-center">
          {error && <p className="text-md text-white">{error}</p>}
          {loading && <Spinner fill="#ffffff" lg={true} />}
        </div>
      }
    </>
  );
};

export default Room;
