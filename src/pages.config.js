import Admin from './pages/Admin';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Results from './pages/Results';
import Vote from './pages/Vote';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Home": Home,
    "Profile": Profile,
    "Results": Results,
    "Vote": Vote,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};