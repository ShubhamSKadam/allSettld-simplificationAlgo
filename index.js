// Importing Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());

// In-memory data storage
let users = {
  user1Phone: {
    userId: "user1",
    name: "Alice",
    phone: "user1Phone",
    password: "password1",
    groups: [],
  },
  user2Phone: {
    userId: "user2",
    name: "Bob",
    phone: "user2Phone",
    password: "password2",
    groups: [],
  },
  user3Phone: {
    userId: "user3",
    name: "Charlie",
    phone: "user3Phone",
    password: "password3",
    groups: [],
  },
};

let groups = {
  group1: {
    name: "Trip to Goa",
    members: ["user1Phone", "user2Phone", "user3Phone"],
    expenses: [
      {
        expenseId: "expense1",
        payerId: "user1",
        amount: 300,
        description: "Hotel Booking",
        participants: ["user1", "user2", "user3"],
      },
      {
        expenseId: "expense2",
        payerId: "user2",
        amount: 150,
        description: "Dinner",
        participants: ["user1", "user2"],
      },
    ],
  },
};

let userBalances = {
  user1: -150,
  user2: 150,
  user3: 0,
};

// Utility function to generate unique IDs
const generateId = () => Math.random().toString(36).substring(7);

// 1. User Registration & Login
// Register a new user
app.post("/register", (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (users[phone]) {
    return res.status(400).json({ message: "User already exists" });
  }

  const userId = generateId();
  users[phone] = { userId, name, phone, password, groups: [] };
  userBalances[userId] = 0;

  res.json({ message: "User registered successfully", userId });
});

// Login user
app.post("/login", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = users[phone];
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ message: "Login successful", userId: user.userId });
});

// 2. Group Management
// Create a new group
app.post("/create-group", (req, res) => {
  const { userId, groupName, members } = req.body;
  if (!userId || !groupName || !members) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (
    !users[Object.values(users).find((user) => user.userId === userId)?.phone]
  ) {
    return res.status(404).json({ message: "User not found" });
  }

  for (let member of members) {
    if (!users[member]) {
      return res
        .status(404)
        .json({ message: `Member with phone ${member} not registered` });
    }
  }

  const groupId = generateId();
  groups[groupId] = { name: groupName, members, expenses: [] };
  members.forEach((member) => users[member].groups.push(groupId));

  res.json({ message: "Group created successfully", groupId });
});

// 3. Add Expense and Settle Transactions
// Add an expense to a group
app.post("/add-expense", (req, res) => {
  const { groupId, payerId, amount, description, participants } = req.body;
  if (!groupId || !payerId || !amount || !participants) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const group = groups[groupId];
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  // Add expense
  const expenseId = generateId();
  const splitAmount = amount / participants.length;
  group.expenses.push({
    expenseId,
    payerId,
    amount,
    description,
    participants,
  });

  // Update balances
  participants.forEach((participantId) => {
    if (participantId !== payerId) {
      userBalances[participantId] -= splitAmount;
      userBalances[payerId] += splitAmount;
    }
  });

  res.json({ message: "Expense added successfully" });
});

// 4. Settle Balances using Greedy Simplification
app.post("/settle", (req, res) => {
  const { groupId } = req.body;
  if (!groupId) {
    return res.status(400).json({ message: "Group ID is required" });
  }

  const group = groups[groupId];
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  const balances = {};
  group.members.forEach((memberId) => {
    balances[memberId] = userBalances[memberId] || 0;
  });

  const creditors = Object.entries(balances)
    .filter(([_, balance]) => balance > 0)
    .sort((a, b) => b[1] - a[1]);
  const debtors = Object.entries(balances)
    .filter(([_, balance]) => balance < 0)
    .sort((a, b) => a[1] - b[1]);

  const transactions = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    let [debtorId, debtorAmount] = debtors[i];
    let [creditorId, creditorAmount] = creditors[j];

    let settledAmount = Math.min(-debtorAmount, creditorAmount);
    transactions.push({ debtorId, creditorId, amount: settledAmount });

    balances[debtorId] += settledAmount;
    balances[creditorId] -= settledAmount;

    if (balances[debtorId] === 0) i++;
    if (balances[creditorId] === 0) j++;
  }

  res.json({ message: "Settlement calculated", transactions });
});

// 5. Get User Balances
// Get a user's balance details
app.get("/user-balance/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userId || !userBalances[userId]) {
    return res.status(404).json({ message: "User not found" });
  }

  const balance = userBalances[userId];
  res.json({ message: "User balance fetched successfully", userId, balance });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
