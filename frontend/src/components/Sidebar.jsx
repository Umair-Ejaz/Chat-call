import { useState } from 'react';
import { Search, LogOut } from 'lucide-react';

export default function Sidebar({ users = [], activeUser, setActiveUser, onlineUsers = [], currentUser, onLogout }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = (users || [])
    .filter((u) => u && u._id !== currentUser?._id)
    .filter((u) => (u?.username || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <aside className="w-1/4 border-r border-slate-800 p-4 flex flex-col bg-slate-900/40">
      <h2 className="text-xl font-bold mb-4 text-emerald-400">Direct Messages</h2>

      {/* Search Input Box */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500"
        />
      </div>

      {/* Filtered Users List */}
      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {filteredUsers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No contacts found</p>
        ) : (
          filteredUsers.map((u) => {
            const isOnline = onlineUsers.includes(u?._id);
            const isSelected = activeUser?._id === u?._id;
            const userInitial = u?.username ? u.username[0].toUpperCase() : 'U';

            return (
              <div
                key={u?._id}
                onClick={() => setActiveUser(u)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/50'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-semibold uppercase">
                      {userInitial}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{u?.username || 'User'}</p>
                    <p className="text-xs text-slate-400">{isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current Logged-In User Profile Footer */}
      {currentUser && (
        <div className="pt-4 mt-auto border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold uppercase text-xs">
              {currentUser?.username ? currentUser.username[0].toUpperCase() : 'Y'}
            </div>
            <div>
              <p className="font-medium text-xs text-slate-200">{currentUser?.username || 'You'} (You)</p>
              <p className="text-[10px] text-emerald-400">Online</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}