import { FC } from "react";

interface SpinnerProps {
  fill?: string;
  full?: boolean;
  lg?: boolean;
}

const Spinner: FC<SpinnerProps> = ({ fill, full = true, lg = false }) => {
  return (
    <div
      className={`${full && "w-full h-full"} flex justify-center align-center`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="Spinner"
        width={lg ? "50px" : "30px"}
        height={lg ? "50px" : "30px"}
      >
        <path
          fill={fill ? fill : "#555555"}
          d="M50.287,32A18.287,18.287,0,1,1,32,13.713a1.5,1.5,0,1,1,0,3A15.287,15.287,0,1,0,47.287,32a1.5,1.5,0,0,1,3,0Z"
        />
      </svg>
    </div>
  );
};

export default Spinner;
