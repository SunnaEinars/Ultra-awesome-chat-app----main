const socket = io();

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');



// Handle user name choice and initial join
socket.on('chooseName', () => {
    let userName = prompt('Pick a user name');
    if (userName) {
        socket.emit('chooseName', userName); // Send the chosen name back to the server
    } else {
        userName = 'Guest'; // Default name if none provided
        socket.emit('chooseName', userName);
    }
});

// Submitting a chat message
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

// Listen for room updates and update the UI
socket.on('update current room', (roomName) => {
    const currentRoomDisplay = document.querySelector('.current-room');
    if (currentRoomDisplay) {
        currentRoomDisplay.textContent = `Current Room: ${roomName}`;
    }
});

// Update user list in the sidebar
socket.on('updateUserList', userList => {
    const sidebar = document.querySelector('.current-users');
    sidebar.innerHTML = userList.map(user => `<li>${user}</li>`).join('');
});

function centerLatestMessage() {
    const messages = document.getElementById('messages');
    if (messages.lastElementChild) {
        // Calculate the vertical position to center the last message
        const lastMessageHeight = messages.lastElementChild.offsetHeight;
        const scrollOffset = messages.lastElementChild.offsetTop - (messages.clientHeight / 2) + (lastMessageHeight / 2);
        messages.scrollTop = scrollOffset;
    }
}

// Call this function after adding a new message
centerLatestMessage();

// Handle incoming chat messages
socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg; // msg now includes the timestamp
    messages.appendChild(item);
    centerLatestMessage(); // Adjust scroll to center the new message
});

window.onresize = function() {
    centerLatestMessage();
};


// Handle chat history
socket.on('chat history', (chatHistory) => {
    chatHistory.forEach(msg => {
        const item = document.createElement('li');
        item.textContent = `${msg.time} - ${msg.userName}: ${msg.message}`;
        messages.appendChild(item);
    });
});




// Update available rooms
socket.on('update room list', (rooms) => {
    const roomList = document.querySelector('.available-rooms');
    roomList.innerHTML = ''; // Clear existing rooms
    rooms.forEach(roomName => {
        const listItem = document.createElement('li');
        const roomButton = document.createElement('button');
        roomButton.textContent = roomName;
        roomButton.classList.add('room-name');
        roomButton.onclick = function() {
            socket.emit('join room', roomName);
        };
        listItem.appendChild(roomButton);
        roomList.appendChild(listItem);
    });
});

/*
// Creating a new room
document.getElementById('createRoom').addEventListener('click', function() {
    const roomName = document.getElementById('newRoomName').value;
    if (roomName) {
        socket.emit('create room', roomName);
        document.getElementById('newRoomName').value = ''; // Clear the input after sending
    }*/


// Filter by user

const filterForm = document.getElementById('FilterByUser');
const filterInput = document.getElementById('newFilterByUser');
const messagesContainer = document.getElementById('messages');

document.getElementById('findUser').addEventListener('click', function() {
    const filterName = filterInput.value.trim();
    filterMessagesByUser(filterName);
});

function filterMessagesByUser(userName) {
    // Clear current messages
    messagesContainer.innerHTML = '';

    // Filter messages by user name
    socket.emit('request user messages', userName);  // Request messages for specific user from server
}

// Handle received chat history or specific user messages
socket.on('chat history', (chatHistory) => {
    displayMessages(chatHistory);
});

socket.on('user messages', (messages) => {
    displayMessages(messages);  // This can be a filtered list sent back by the server
});

function displayMessages(messages) {
    messages.forEach(msg => {
        if (!filterInput.value || msg.userName === filterInput.value.trim()) {
            const item = document.createElement('li');
            item.textContent = `${msg.time} - ${msg.userName}: ${msg.message}`;
            messagesContainer.appendChild(item);
        }
    });
    centerLatestMessage(); // Call this function here to ensure centering after update
}

document.getElementById('clearFilter').addEventListener('click', function() {
    filterInput.value = ''; // Clear the input field
    fetchAllMessages(); // Function to fetch all messages
});

function fetchAllMessages() {
    messages.innerHTML = ''; // Clear current messages
    socket.emit('request all messages'); // You would need to handle this on the server side
}