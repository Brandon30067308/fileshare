import { faArrowDown, faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch } from "react";
import { FC } from "react";

interface FileDownloadProps {
  setDownloadModal: Dispatch<boolean>;
}

const FileDownload: FC<FileDownloadProps> = ({ setDownloadModal }) => {
  return (
    <div className="flex flex-column align-center justify-center">
      <p className="text-mutedAlt text-md mb-1 text-center">
        You recieved a file, click button below to download
        <FontAwesomeIcon icon={faArrowDown} className="ml-0-75" />
      </p>
      <button
        className="bg-mutedAlt text-md py-1-5 px-1"
        onClick={() => setDownloadModal(true)}
      >
        Download
        <FontAwesomeIcon icon={faDownload} className="ml-0-75" />
      </button>
    </div>
  );
};

export default FileDownload;
