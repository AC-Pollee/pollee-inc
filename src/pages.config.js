import Admin from './pages/Admin';
import FranchiseAdmin from './pages/FranchiseAdmin';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Results from './pages/Results';
import Vote from './pages/Vote';
import InfomarianDashboard from './pages/InfomarianDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "FranchiseAdmin": FranchiseAdmin,
    "Home": Home,
    "Profile": Profile,
    "Results": Results,
    "Vote": Vote,
    "InfomarianDashboard": InfomarianDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};