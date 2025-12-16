import Home from './pages/Home';
import Vote from './pages/Vote';
import Results from './pages/Results';
import Admin from './pages/Admin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Vote": Vote,
    "Results": Results,
    "Admin": Admin,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};