import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { getAllTeams, updateTeamStatus } from '../../api/services/team.service'; 
import { getAllUsers, approveUser, deleteUser } from '../../api/services/user.service';
import { getAllEvents } from '../../api/services/event.service'; 

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { 
  Building2, 
  Users, 
  Calendar, 
  Plus, 
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Trash2,
  Hourglass, 
  LogOut,
  Shield // Added for Super Admin card
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('organizations');
  
  const [organizations, setOrganizations] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]); 
  const [platformEvents, setPlatformEvents] = useState([]); 
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    pendingCount: 0,
    activeEvents: 0, 
  });

  const isApprovalPending = user && user.isApproved === false;

  const fetchPlatformData = async () => {
    setLoading(true);
    try {
      const [teamsRes, usersRes, eventsRes] = await Promise.all([
        getAllTeams(),
        getAllUsers(),
        getAllEvents({ limit: 100 }) 
      ]);

      const fetchedTeams = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.teams || teamsRes?.data?.teams || []);
      const fetchedUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.users || usersRes?.data?.users || []);
      const fetchedEvents = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.events || eventsRes?.data?.events || []);
      
      const pending = fetchedUsers.filter(u => !u.isApproved);
      const approved = fetchedUsers.filter(u => u.isApproved);

      setOrganizations(fetchedTeams);
      setPendingUsers(pending);
      setApprovedUsers(approved);
      setPlatformEvents(fetchedEvents); 

      setStats({
        totalOrgs: fetchedTeams.length,
        totalUsers: approved.length, 
        pendingCount: pending.length,
        activeEvents: fetchedEvents.length,
      });

    } catch (err) {
      toast.error("Failed to sync platform-wide data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isApprovalPending) {
      fetchPlatformData();
    } else {
      setLoading(false); 
    }
  }, [isApprovalPending]);

  const handleApproveUser = async (userId) => {
    try {
      await approveUser(userId);
      toast.success("User access granted!");
      fetchPlatformData(); 
    } catch (error) {
      toast.error("Approval failed");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;
    
    try {
      await deleteUser(userId);
      toast.success("User deleted successfully");
      fetchPlatformData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  const handleToggleStatus = async (teamId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'archived' : 'active';
    if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
      await updateTeamStatus(teamId, { status: newStatus });
      toast.success(`Organization ${newStatus} successfully`);
      fetchPlatformData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const sidebarCards = [
    { id: 'organizations', label: 'Hosted Organizations', value: stats.totalOrgs, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'pending', label: 'Pending Approvals', value: stats.pendingCount, icon: UserCheck, color: stats.pendingCount > 0 ? 'text-orange-600' : 'text-gray-500', bg: stats.pendingCount > 0 ? 'bg-orange-50' : 'bg-gray-50' },
    { id: 'users', label: 'Platform Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'events', label: 'Platform Events', value: stats.activeEvents, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>;

  const renderContent = () => {
    switch(activeTab) {
      case 'organizations':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="text-indigo-500" /> Hosted Organizations
              </h2>
              <Button onClick={() => navigate('/super-admin/organizations/new')} size="sm" className="flex items-center cursor-pointer">
                <Plus className="h-4 w-4 mr-1" /> New Org
              </Button>
            </div>
            
            {organizations.length === 0 ? (
               <Card className="text-center py-12 border-dashed">
                 <p className="text-gray-500">No organizations created yet.</p>
               </Card>
            ) : (
              <Card className="overflow-x-auto p-0!">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4">Organization</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {organizations.map((org) => (
                      <tr key={org._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{org.name}</td>
                        <td className="px-6 py-4">
                          <Badge variant={org.status === 'active' ? 'success' : 'warning'}>{org.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button className="cursor-pointer" size="sm" variant="outline" onClick={() => handleToggleStatus(org._id, org.status)}>
                            {org.status === 'active' ? 'Archive' : 'Restore'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        );

      case 'pending':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <UserCheck className="text-orange-500" /> Pending Registrations
            </h2>
            {pendingUsers.length === 0 ? (
              <Card className="bg-gray-50 border-dashed border-2 text-center py-12">
                <ShieldAlert className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Inbox Zero!</p>
                <p className="text-xs text-gray-400 mt-1">No users currently awaiting approval.</p>
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden border-orange-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-orange-50/50 border-b border-orange-100">
                    <tr>
                      <th className="px-6 py-4">User Details</th>
                      <th className="px-6 py-4">Organization</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingUsers.map(u => (
                      <tr key={u._id} className="hover:bg-orange-50/30">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email} • <span className="uppercase font-bold text-indigo-600">{u.role}</span></div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{u.team?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" onClick={() => handleApproveUser(u._id)} className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                            Approve User
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        );

      case 'users':
        // 🚀 NEW GROUPING LOGIC INJECTED HERE
        const superAdmins = approvedUsers.filter(u => u.role.toLowerCase() === 'super_admin');
        const regularUsers = approvedUsers.filter(u => u.role.toLowerCase() !== 'super_admin');

        const usersByOrganization = regularUsers.reduce((groups, u) => {
          const orgName = u.team?.name || 'Unassigned Platform Users';
          if (!groups[orgName]) groups[orgName] = [];
          groups[orgName].push(u);
          return groups;
        }, {});

        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="text-blue-500" /> Approved Platform Users
            </h2>
            
            {approvedUsers.length === 0 ? (
              <Card className="p-8 text-center text-gray-500 border-dashed">
                No approved users found.
              </Card>
            ) : (
              <div className="space-y-10">
                
                {/* 1. SUPER ADMINS CARD */}
                {superAdmins.length > 0 && (
                  <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center mb-4">
                      <Shield className="h-5 w-5 text-indigo-600 mr-2" />
                      Platform Administrators
                    </h3>
                    <Card className="p-0 border-indigo-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-indigo-50/50 text-indigo-900 border-b border-indigo-100">
                            <tr>
                              <th className="px-6 py-4 font-bold">Name</th>
                              <th className="px-6 py-4 font-bold">Email</th>
                              <th className="px-6 py-4 font-bold">Role</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {superAdmins.map(admin => (
                              <tr key={admin._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">{admin.name}</td>
                                <td className="px-6 py-4 text-gray-500">{admin.email}</td>
                                <td className="px-6 py-4">
                                  <Badge className="bg-indigo-100 text-indigo-700 uppercase text-[10px] tracking-wider font-bold">
                                    {admin.role.replace('_', ' ')}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}

                {/* 2. ORGANIZATION CARDS */}
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center mb-4">
                    <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                    Hosted Organizations
                  </h3>
                  
                  <div className="space-y-6">
                    {Object.keys(usersByOrganization).length === 0 ? (
                      <p className="text-gray-500 italic text-sm">No standard organizations found.</p>
                    ) : (
                      Object.entries(usersByOrganization).map(([orgName, members]) => (
                        <Card key={orgName} className="p-0 overflow-hidden border border-gray-200">
                          
                          {/* Card Header */}
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <h4 className="font-extrabold text-gray-900 text-base">{orgName}</h4>
                            <Badge variant="outline" className="text-gray-500 bg-white">
                              {members.length} {members.length === 1 ? 'Member' : 'Members'}
                            </Badge>
                          </div>

                          {/* Card Body */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="text-gray-400 border-b border-gray-50">
                                <tr>
                                  <th className="px-6 py-3 font-semibold w-1/3">Name</th>
                                  <th className="px-6 py-3 font-semibold w-1/3">Email</th>
                                  <th className="px-6 py-3 font-semibold">Role</th>
                                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {members.map(member => (
                                  <tr key={member._id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-semibold text-gray-800">{member.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{member.email}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant="outline" 
                                          className={`uppercase text-[10px] tracking-wider ${
                                            member.role === 'admin' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                            member.role === 'sub-admin' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                                            'border-gray-200 text-gray-600 bg-gray-50'
                                          }`}
                                        >
                                          {member.role.replace('-', ' ')}
                                        </Badge>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      {member._id !== user?._id && (
                                        <button 
                                          onClick={() => handleDeleteUser(member._id, member.name)} 
                                          className="text-gray-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                                          title="Remove User"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        );

      case 'events':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="text-purple-500" /> Platform-Wide Events
            </h2>
            
            {platformEvents.length === 0 ? (
              <Card className="text-center py-12 border-dashed">
                <p className="text-gray-500">No events have been created by any organization yet.</p>
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden border-purple-100">
                <table className="w-full text-sm text-left">
                  <thead className="bg-purple-50/50 border-b border-purple-100">
                    <tr>
                      <th className="px-6 py-4">Event Name</th>
                      <th className="px-6 py-4">Organization</th>
                      <th className="px-6 py-4">Phase</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {platformEvents.map(event => (
                      <tr key={event._id} className="hover:bg-purple-50/30">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{event.title}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.date || event.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {event.team?.name || event.club?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="uppercase text-[10px]">
                            {event.phase || 'Planning'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                           <Badge variant={event.isFinalized ? 'success' : 'warning'} className="text-[10px]">
                            {event.isFinalized ? 'Completed' : 'Active'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gray-50/50">
      
      {/* ========================================== */}
      {/* FULL SCREEN PENDING APPROVAL MODAL OVERLAY */}
      {/* ========================================== */}
      {isApprovalPending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-6">
              <Hourglass className="h-8 w-8 text-amber-600 animate-pulse" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Approval Pending
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>! Your account is verified, but your workspace access is waiting for an administrator's approval.
            </p>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-8 text-sm text-amber-800 flex gap-3 text-left">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p>You will receive an email notification or gain access here once the team accepts your request.</p>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors w-full p-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out for now
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MAIN DASHBOARD (BLURRED IF PENDING)        */}
      {/* ========================================== */}
      <div className={`flex flex-col md:flex-row min-h-full transition-all duration-300 ${
        isApprovalPending ? 'pointer-events-none blur-md select-none overflow-hidden h-[calc(100vh-4rem)] opacity-40' : ''
      }`}>
        
        <aside className="w-full md:w-80 p-4 sm:p-6 border-r border-gray-200 bg-white flex flex-col gap-4">
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Command Center</h1>
            <p className="text-sm text-gray-500 mt-1">Select a module to manage.</p>
          </div>

          <div className="flex flex-col gap-3">
            {sidebarCards.map((card) => {
              const Icon = card.icon;
              const isActive = activeTab === card.id;

              return (
                <button
                  key={card.id}
                  onClick={() => setActiveTab(card.id)}
                  className={`w-full text-left transition-all duration-200 rounded-xl border-2 p-4 flex items-center justify-between group cursor-pointer
                    ${isActive 
                      ? `border-indigo-600 shadow-md ${card.bg}` 
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${card.bg} ${card.color} ${isActive ? 'bg-white shadow-sm' : ''}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                        {card.label}
                      </p>
                      <p className={`text-xl font-bold mt-0.5 ${isActive ? card.color : 'text-gray-900'}`}>
                        {card.value}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`transition-transform ${isActive ? 'text-indigo-600 translate-x-1' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`} size={20} />
                </button>
              )
            })}
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50">
          {renderContent()}
        </main>

      </div>
    </div>
  );
}