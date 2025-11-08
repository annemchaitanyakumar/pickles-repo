import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

const UserManagement = ({ 
  users, 
  searchTerm, 
  setSearchTerm, 
  usersPage, 
  setUsersPage, 
  isLoadingUsers, 
  totalPages = Math.ceil(users.length / 10),
  fetchUsers 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h3 className="text-xl font-semibold mb-4 sm:mb-0">User Management</h3>
        <div className="w-full sm:w-96 flex gap-2">
          <Input
            placeholder="Search users"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); }}
            className="w-full"
          />
          <Button onClick={() => { fetchUsers(usersPage); }} size="sm" className="shrink-0">
            Refresh
          </Button>
        </div>
      </div>

      {/* Mobile view */}
      <div className="block sm:hidden">
        <div className="space-y-4">
          {users.length === 0 && !isLoadingUsers ? (
            <div className="text-center text-sm text-gray-500 py-4">No users found</div>
          ) : (
            users.map((u) => (
              <div key={u.userid} className="bg-white rounded-lg shadow p-4 border">
                <div className="flex justify-between items-start">
                  <div className="font-medium">#{u.userid}</div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                    {u.role}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="font-medium">{u.firstname} {u.lastname}</div>
                  <div className="text-sm text-gray-500 mt-1">{u.emailid}</div>
                  <div className="text-sm text-gray-500">{u.mobilenum}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">User ID</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Role</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Mobile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 && !isLoadingUsers ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.userid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-4 text-sm">{u.userid}</td>
                    <td className="px-3 py-4 text-sm font-medium">{u.firstname} {u.lastname}</td>
                    <td className="px-3 py-4 text-sm">{u.emailid}</td>
                    <td className="px-3 py-4 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm">{u.mobilenum}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <p className="text-sm text-muted-foreground order-2 sm:order-1">
          Page {usersPage + 1}
        </p>
        <div className="flex items-center justify-center gap-2 order-1 sm:order-2">
          <Button 
            variant="outline"
            size="sm"
            className="w-24 sm:w-auto"
            disabled={usersPage === 0 || isLoadingUsers}
            onClick={() => setUsersPage(p => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-24 sm:w-auto"
            disabled={isLoadingUsers || users.length < 1}
            onClick={() => setUsersPage(p => p + 1)}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4 sm:ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;