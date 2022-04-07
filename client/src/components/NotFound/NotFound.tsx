import { FC } from "react";
import { Link } from "react-router-dom";

const NotFound: FC = () => (
  <p className="text-white text-md">
    Page not found. <Link to="/">home</Link>
  </p>
);

export default NotFound;
