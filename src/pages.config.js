import Admin from './pages/Admin';
import FranchiseAdmin from './pages/FranchiseAdmin';
import FranchiseManagerDashboard from './pages/FranchiseManagerDashboard';
import Home from './pages/Home';
import InfomarianDashboard from './pages/InfomarianDashboard';
import MasterFranchiserDashboard from './pages/MasterFranchiserDashboard';
import Profile from './pages/Profile';
import Results from './pages/Results';
import Vote from './pages/Vote';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "FranchiseAdmin": FranchiseAdmin,
    "FranchiseManagerDashboard": FranchiseManagerDashboard,
    "Home": Home,
    "InfomarianDashboard": InfomarianDashboard,
    "MasterFranchiserDashboard": MasterFranchiserDashboard,
    "Profile": Profile,
    "Results": Results,
    "Vote": Vote,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};