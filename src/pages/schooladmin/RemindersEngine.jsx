import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import Modal from '../../components/common/Modal';
import { Bell, Send, AlertTriangle, Info, Clock, CheckCircle2, Megaphone, Image as ImageIcon, Video as VideoIcon, Eye, Check } from 'lucide-react';

export default function RemindersEngine() {
  const { reminders, broadcastReminder, broadcastNotes, markNoteAsRead, currentUser } = useApp();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('High');

  // Preview Modal state
  const [selectedImage, setSelectedImage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    broadcastReminder(title, content, priority);
    setTitle('');
    setContent('');
  };

  // Filter notes directed to this school admin or global
  const incomingDirectives = (broadcastNotes || []).filter(
    n => n.targetSchoolId === 'all' || n.targetSchoolId === currentUser?.schoolId
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notes & Directives Center</h1>
            <p className="text-xs text-slate-500 font-medium">View Super Admin directives with rich media previews and publish faculty announcements.</p>
          </div>
        </div>

        {/* Super Admin Directives Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-600" />
              Incoming Super Admin Directives & Policy Notes
            </h3>
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-extrabold">
              {incomingDirectives.length} Directives Received
            </span>
          </div>

          {incomingDirectives.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">No incoming Super Admin directives found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingDirectives.map(note => {
                const isRead = note.isReadBy && note.isReadBy.includes(currentUser?.email || currentUser?.id);
                return (
                  <div
                    key={note.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isRead ? 'bg-slate-50 border-slate-200' : 'bg-purple-50/70 border-purple-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{note.title}</span>
                        {!isRead && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                            UNREAD DIRECTIVE
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => markNoteAsRead(note.id)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          isRead ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700'
                        }`}
                        title={isRead ? 'Marked as Read' : 'Click to Mark as Read'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 font-medium leading-relaxed mb-3">{note.description}</p>

                    {/* Rich Media Previews */}
                    {note.imageUrl && (
                      <div className="mb-3">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-purple-600" /> Image Attachment:
                        </span>
                        <img
                          src={note.imageUrl}
                          alt="Attachment Preview"
                          onClick={() => setSelectedImage(note.imageUrl)}
                          className="h-32 w-full object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </div>
                    )}

                    {note.videoUrl && (
                      <div className="mb-3">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1 flex items-center gap-1">
                          <VideoIcon className="w-3 h-3 text-purple-600" /> Video Attachment / Player:
                        </span>
                        <video src={note.videoUrl} controls className="h-36 w-full object-cover rounded-lg bg-black border border-slate-200" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                      <span>Sender: <strong className="text-slate-800">{note.sender}</strong></span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Faculty Broadcast Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Publish Faculty Announcement
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Marks Deadline"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="High">High Priority (Urgent)</option>
                  <option value="Normal">Normal Notification</option>
                  <option value="Low">General Information</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Instruction Content</label>
                <textarea
                  rows={5}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write message content for all assigned faculty members..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                <span>Publish Broadcast to Faculty</span>
              </button>
            </form>
          </div>

          {/* Faculty Broadcast Feed */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-4">Published Faculty Broadcast Feed</h3>

            <div className="space-y-4">
              {reminders.map(rem => {
                const isHigh = rem.priority === 'High';
                return (
                  <div key={rem.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-900 text-sm">{rem.title}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isHigh ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {rem.priority} Priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{rem.content}</p>
                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Sender: <strong className="text-slate-800">{rem.sender}</strong></span>
                      <span className="font-mono">{rem.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Full Image Preview Lightbox Modal */}
        <Modal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          title="Attached Image Preview"
          maxWidth="max-w-3xl"
        >
          {selectedImage && (
            <div className="p-2">
              <img src={selectedImage} alt="Full Attached Media" className="w-full h-auto rounded-xl object-contain max-h-[70vh]" />
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}
