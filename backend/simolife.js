// backend/simolife.js

let waitingUsers = []; // { socketId, userId, username, profilePic }

function addUser(socket, user) {
  if (!waitingUsers.some(u => u.userId === user.id)) {
    waitingUsers.push({
      socketId: socket.id,
      userId: user.id,
      username: user.username,
      profilePic: user.profilePic,
    });
  }
}

function removeUser(socket) {
  waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);
}

function findPair() {
  if (waitingUsers.length >= 2) {
    const [user1, user2] = waitingUsers.splice(0, 2);
    return [user1, user2];
  }
  return null;
}

module.exports = {
  addUser,
  removeUser,
  findPair,
  getWaiting: () => waitingUsers,
};
