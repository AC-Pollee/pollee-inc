import Admin from './pages/Admin';
import FranchiseAdmin from './pages/FranchiseAdmin';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Results from './pages/Results';
import Vote from './pages/Vote';
import InfomarianDashboard from './pages/InfomarianDashboard';
import MasterFranchiserDashboard from './pages/MasterFranchiserDashboard';
import FranchiseManagerDashboard from './pages/FranchiseManagerDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "FranchiseAdmin": FranchiseAdmin,
    "Home": Home,
    "Profile": Profile,
    "Results": Results,
    "Vote": Vote,
    "InfomarianDashboard": InfomarianDashboard,
    "MasterFranchiserDashboard": MasterFranchiserDashboard,
    "FranchiseManagerDashboard": FranchiseManagerDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};