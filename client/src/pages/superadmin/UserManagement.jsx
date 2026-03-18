import { useState, useEffect } from 'react';
import { getAllUsers } from '../../api/services/user.service';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers();
        
        // 🔍 DEBUG: Let's see exactly what the server sends
        console.log("DIRECTORY USER DATA:", response);

        // ✅ Robust Unpacking (Same as your Dashboard)
        const fetchedUsers = Array.isArray(response) 
          ? response 
          : (response?.users || response?.data?.users || []);

        setUsers(fetchedUsers);
      } catch (err) {
        // ✅ Now we will actually see why it fails in the console
        console.error("Directory fetch error:", err);
        toast.error(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform User Directory</h1>
        <p className="text-sm text-gray-500 mt-1">
          A complete list of all registered users across all organizations.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users found on the platform.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-500">Name</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Email</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Organization</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Role & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {u.team?.name || <span className="text-gray-400 italic">Platform Admin</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {u.role}
                        </Badge>
                        {!u.isApproved && (
                          <Badge variant="warning" className="text-[10px]">Pending</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}