import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Footer from './components/footer/Footer';
import Header from './components/header/Header';
import Search from './components/search/Search';
// import TrainingsPage from './components/page/TrainingsPage'; // TrainingsPage теперь используется в модальном окне
// import Schedule from './components/page/Schedule'; // Schedule теперь используется в модальном окне
// import SignUp from './components/page/SignUp'; // SignUp теперь используется в модальном окне
function App() {
  return (
    <Router>
      <Header />
      <main>

        <Routes>
          <Route path="/" element={<div>Главная страница (пустая)</div>} />
        </Routes>
        <Search/>
        <Footer />
      </main>
    </Router>
  );
}

export default App;


