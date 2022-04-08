import { FC, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightToBracket,
  faUserGroup,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { v4 as uuidV4 } from "uuid";
import fetchWithTimeout from "../../utils/fetchWithTimeout";
import { useNavigate, useLocation } from "react-router-dom";
import Spinner from "../shared/Spinner";
import { useEffect } from "react";
import useMessages from "../../hooks/useMessages";

const Main: FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [roomID, setRoomID] = useState("");
  const { messages, addMessage, removeMessage } = useMessages();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const split = location.search.slice(1).split("&");
    const roomID = split[0]?.split("=")[1];
    const roomFull = split[1]?.split("=")[1];
    roomFull &&
      addMessage({
        type: "error",
        message:
          roomFull === "true"
            ? "Room has reached max users(4)"
            : "Invalid roomID!...",
        persist: true,
        timeout: 10000,
      });
    roomID && setRoomID(roomID);
  }, []);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();

    messages.forEach(({ type, id }) => type === "error" && removeMessage(id));
    const isValidRoomID = roomID.trim().length > 7;

    if (isValidRoomID) {
      setLoading(true);
      fetchWithTimeout("/api/rooms", {
        timeout: 25000,
      })
        .then((res) => {
          setLoading(false);
          if (res.ok) {
            return res.json();
          } else {
            console.log("an error occurred...");
            addMessage({
              type: "error",
              message:
                res.status === 500 ? "Server error!" : "An error occurred!",
              persist: true,
              timeout: 10000,
            });
          }
        })
        .then((rooms) => {
          if (rooms) {
            const inputRoomID = roomID.trim();
            if (
              Object.keys(rooms).includes(inputRoomID) &&
              rooms[inputRoomID].length <= 8
            ) {
              navigate(`/room/${inputRoomID}`);
            } else if (!Object.keys(rooms).includes(inputRoomID)) {
              console.log("Room ID does not exist!");
              addMessage({
                type: "error",
                message: "Room ID does not exist!",
                timeout: 10000,
              });
            } else {
              console.log("Room is full!");
              addMessage({
                type: "error",
                message: "Room is full!",
                timeout: 10000,
              });
            }
          }
        })
        .catch((err) => {
          setLoading(false);
          console.log("an error occurred: ", err.message);
          addMessage({
            type: "error",
            message:
              err.name === "AbortError"
                ? "Network error!"
                : "An error occurred!",
            timeout: 10000,
          });
        });
    } else {
      addMessage({
        type: "error",
        message: "Invalid roomID...",
        timeout: 10000,
      });
    }
  };

  const handleCreateRoom = () => {
    const newRoomID = uuidV4();

    navigate(`/room/${newRoomID}`, {
      state: {
        fromCreateRoom: true,
      },
    });
  };

  return (
    <main className="Main w-full flex justify-center align-center text-secondary">
      <div className="flex flex-column justify-center">
        <h1 className="my-1-25 text-lg">Create a room</h1>
        <button
          className="bg-mutedAlt text-md text-dark flex align-center justify-center p-1-5"
          onClick={handleCreateRoom}
        >
          create room
          <FontAwesomeIcon
            icon={faUserGroup}
            className="fill-dark text-dark ml-0-75"
          />
        </button>
      </div>
      <div className="divide mx-5 text-base text-center">OR</div>
      <div className="flex flex-column justify-center">
        <h1 className="mb-1-25 text-lg">Join a room</h1>
        <form className="w-full flex flex-column" onSubmit={handleJoinRoom}>
          <input
            type="text"
            placeholder="roomID..."
            className="bg-white w-full text-md text-dark mb-0-75 px-1 py-0-75"
            value={roomID}
            onChange={(e) => setRoomID(e.target.value)}
            onFocus={() =>
              messages.forEach(
                ({ persist, id }) => !persist && removeMessage(id)
              )
            }
          />
          <button
            type="submit"
            className="bg-mutedAlt text-md text-dark flex align-center justify-center
              p-1-5"
            style={{
              backgroundColor: loading ? "#dededee6" : "#dedede",
              width: "165px",
              height: "66px",
            }}
            disabled={loading}
          >
            {loading ? (
              <Spinner full={false} />
            ) : (
              <>
                join room
                <FontAwesomeIcon
                  icon={faArrowRightToBracket}
                  className="fill-dark text-dark ml-0-75"
                />
              </>
            )}
          </button>
        </form>
      </div>
      <div className="message-container w-full flex justify-center">
        {/* messages */}
        {messages.map(({ message, id: messageId, type }) => {
          return (
            <div
              className="message-container w-full flex justify-center"
              key={messageId}
            >
              <div
                className={`message w-fit bg-secondary flex align-center justify-space-between
                ${
                  type === "error" ? "text-error" : "text-muted"
                } text-md px-1 py-0-75`}
              >
                {message}
                <button
                  className="close bg-secondary h-fit text-dark text-md ml-1"
                  onClick={() => {
                    removeMessage(messageId);
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} className="bg-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default Main;
