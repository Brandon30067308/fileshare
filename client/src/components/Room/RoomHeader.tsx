import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { AddMessage } from "../../hooks/useMessages";

interface RoomHeaderProps {
  roomID?: string;
  totalUsers?: number;
  addMessage: AddMessage;
}

const RoomHeader: FC<RoomHeaderProps> = ({
  roomID,
  totalUsers,
  addMessage,
}) => {
  return (
    <div className="container flex flex-column align-center text-md">
      <div className="roomID flex justify-center align-center mb-0-75">
        <p className="text-center text-md">
          <span className="text-mutedAlt">RoomID: </span> {roomID?.slice(0, 23)}
          ...
        </p>
        <CopyToClipboard
          text={roomID || ""}
          onCopy={() => {
            addMessage({
              type: "message",
              message: "roomID copied 👍",
              timeout: 5000,
            });
          }}
        >
          <button className="copy flex align-center justify-center text-secondary ml-1">
            <FontAwesomeIcon icon={faCopy} className="text-xl" />
          </button>
        </CopyToClipboard>
      </div>
      <div>
        <p className="text-center text-md">
          <span className="text-mutedAlt">Users in room:</span> {totalUsers}
        </p>
      </div>
    </div>
  );
};

export default RoomHeader;
