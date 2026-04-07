import { useState, useEffect } from 'react';
import { getAllUsers } from '../../api/services/user.service';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';
import toast from 'react-hot-toast';
import { Shield, Building2, Trash2 } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers();
        const fetchedUsers = Array.isArray(response) 
          ? response 
          : (response?.users || response?.data?.users || []);

        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Directory fetch error:", err);
        toast.error(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Placeholder for delete functionality (connect to your API service when ready)
  const handleDeleteUser = (userId) => {
    if(window.confirm('Are you sure you want to remove this user?')) {
      toast.error("Delete API not yet connected!");
      // TODO: await deleteUser(userId); fetchUsers();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // 1. Separate Super Admins from regular users
  const superAdmins = users.filter(user => user.role.toLowerCase() === 'super_admin');
  const regularUsers = users.filter(user => user.role.toLowerCase() !== 'super_admin');

  // 2. Group regular users by their Organization Name
  const usersByOrganization = regularUsers.reduce((groups, user) => {
    const orgName = user.team?.name || 'Unassigned Platform Users';
    if (!groups[orgName]) {
      groups[orgName] = [];
    }
    groups[orgName].push(user);
    return groups;
  }, {});

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform User Directory</h1>
        <p className="text-sm text-gray-500 mt-1">
          A complete list of all registered users grouped by their organizations.
        </p>
      </div>

      {users.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No users found on the platform.
        </Card>
      ) : (
        <div className="space-y-10">
          
          {/* ========================================== */}
          {/* SECTION 1: SUPER ADMINS */}
          {/* ========================================== */}
          {superAdmins.length > 0 && (
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center mb-4">
                <Shield className="h-5 w-5 text-indigo-600 mr-2" />
                Platform Administrators
              </h2>
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

          {/* ========================================== */}
          {/* SECTION 2: ORGANIZATIONS */}
          {/* ========================================== */}
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center mb-4">
              <Building2 className="h-5 w-5 text-gray-400 mr-2" />
              Hosted Organizations
            </h2>
            
            <div className="space-y-6">
              {Object.keys(usersByOrganization).length === 0 ? (
                <p className="text-gray-500 italic text-sm">No standard organizations found.</p>
              ) : (
                Object.entries(usersByOrganization).map(([orgName, members]) => (
                  <Card key={orgName} className="p-0 overflow-hidden border border-gray-200">
                    
                    {/* Organization Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <h3 className="font-extrabold text-gray-900 text-base">{orgName}</h3>
                      <Badge variant="outline" className="text-gray-500 bg-white">
                        {members.length} {members.length === 1 ? 'Member' : 'Members'}
                      </Badge>
                    </div>

                    {/* Members Table */}
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
                                  {!member.isApproved && (
                                    <Badge variant="warning" className="text-[10px]">Pending</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleDeleteUser(member._id)} 
                                  className="text-gray-300 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
                                  title="Remove User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
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
}