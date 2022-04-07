import "./App.scss";
import Main from "./components/Main/Main";
import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import Room from "./components/Room/Room";
import NotFound from "./components/NotFound/NotFound";

function App() {
  return (
    <Router>
      <div
        className="App w-full bg-primary flex flex-column align-center justify-center
          py-4-5 px-2"
      >
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/room/:roomID" element={<Room />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
