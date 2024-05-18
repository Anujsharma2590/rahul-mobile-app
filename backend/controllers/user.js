import { validationResult } from "express-validator";
import { connection } from "../config/database.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/jwtUtils.js";
const salt = 5;
export const createUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check if the email already exists in the database
    const emailExistsQuery =
      "SELECT COUNT(*) AS count FROM login WHERE email = ?";
    const [emailExistsRows] = await connection.execute(emailExistsQuery, [
      req.body.email,
    ]);

    if (emailExistsRows[0].count > 0) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    // If email does not exist, proceed with registration
    const hashedPassword = await bcrypt.hash(
      req.body.password.toString(),
      salt
    );
    const sql =
      "INSERT INTO login (`name`, `email`, `password`) VALUES (?, ?, ?)";
    const values = [req.body.name, req.body.email, hashedPassword];
    await connection.execute(sql, values);
    return res.json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const userLogin = async (req, res) => {

  try {
    const sql = "SELECT * FROM login WHERE email = ?";
    const values = [req.body.email];
    const [rows] = await connection.execute(sql, values);
    if (rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }
    const match = await bcrypt.compare(
      req.body.password.toString(),
      rows[0].password
    );
    if (match) {
      const token = generateToken(rows[0].id);
      return res.json({
        success: true,
        profileData: rows[0],
        message: "Login successful",
        token,
      });
    } else {
      return res.json({ success: false, error: "Invalid password" });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



export const addExpense = async (req, res) => {
  try {
    const { heading, date } = req.body;
    const amount = Number(req.body.amount);
    const sql =
      "INSERT INTO transactions (transactionType, heading, date, amount) VALUES (?, ?, ?, ?)";
    const values = ["expense", heading, date, amount];
    await connection.execute(sql, values);
    res
      .status(201)
      .json({ success: true, message: "Expense added successfully" });
  } catch (error) {
    console.error("Error adding expenses", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const addIncome = async (req, res) => {
  try {
    const { heading, date } = req.body;
    const amount = Number(req.body.amount);
    const sql =
      "INSERT INTO transactions (transactionType, heading, date, amount) VALUES (?, ?, ?, ?)";
    const values = ["income", heading, date, amount];
    await connection.execute(sql, values);
    res
      .status(201)
      .json({ success: true, message: "Income added successfully" });
  } catch (error) {
    console.error("Error adding income", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const sql = "SELECT * FROM transactions";
    const [rows] = await connection.execute(sql);
    let totalBalance = 0;
    let expense = 0;
    let income = 0;

    const transactions = rows.map((row) => {
      if (row.transactionType === "expense") {
        expense += Number(row.amount);
      } else {
        income += Number(row.amount);
      }

      return {
        id: row.id,
        transactionType: row.transactionType,
        heading: row.heading,
        date: row.date,
        amount: row.amount,
      };
    });

    totalBalance = income - expense;

    res.json({
      totalBalance,
      expense,
      income,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const sql = "DELETE FROM transactions WHERE id = ?";
    const [result] = await connection.execute(sql, [transactionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const editTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { transactionType, heading, date, amount } = req.body;

    const sql = "UPDATE transactions SET transactionType = ?, heading = ?, date = ?, amount = ? WHERE id = ?";
    const values = [transactionType, heading, new Date(), amount, transactionId];
    const [result] = await connection.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.json({ success: true, message: "Transaction updated successfully" });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};


