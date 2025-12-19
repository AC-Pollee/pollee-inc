import Admin from './pages/Admin';
import Home from './pages/Home';
import Results from './pages/Results';
import Vote from './pages/Vote';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Home": Home,
    "Results": Results,
    "Vote": Vote,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};