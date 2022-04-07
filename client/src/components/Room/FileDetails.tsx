import { faDownload, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC } from "react";
import Modal from "react-modal";

interface FileDetailsProps {
  name: string;
  size: string | null;
  open: boolean;
  setOpen: Dispatch<boolean>;
  handleDownload: () => void;
}

const FileDetails: FC<FileDetailsProps> = ({
  name,
  size,
  open,
  setOpen,
  handleDownload,
}) => {
  return (
    <Modal
      isOpen={open}
      onRequestClose={() => setOpen(false)}
      shouldCloseOnOverlayClick={true}
      ariaHideApp={false}
    >
      <div className="w-full flex justify-flex-end align-center">
        <button
          className="close w-fit text-muted"
          onClick={() => setOpen(false)}
        >
          <FontAwesomeIcon icon={faXmark} size="lg" className="bg-white" />
        </button>
      </div>
      <div className="w-full flex flex-column align-center justify-center items-center mt-1-5">
        <p
          className="mb-1 text-dark text-md flex align-center justify-center"
          style={{ flexWrap: "wrap" }}
        >
          {/* file name */}
          <span className="text-muted mr-0-25">File name:</span>
          {name.length > 23
            ? name.slice(0, 20) + ".." + name.slice(name.lastIndexOf("."))
            : name}
        </p>
        <p
          className="mb-1 text-dark text-md align-center justify-center"
          style={{ flexWrap: "wrap" }}
        >
          <span className="text-muted mr-0-25">File size:</span>
          {/* size in megabyte */}
          {size + "mb"}
        </p>
        <button
          className="bg-mutedAlt text-muted text-md py-1-5 px-0-75"
          onClick={() => {
            handleDownload();
            setOpen(false);
          }}
        >
          {/* download file button */}
          Download file{" "}
          <FontAwesomeIcon icon={faDownload} className="ml-0-75" />
        </button>
      </div>
    </Modal>
  );
};

export default FileDetails;
