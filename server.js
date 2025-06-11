import express from "express"
import dotenv from "dotenv"
import { sql } from "./config/db.js"
import ratelimiter from "./middleware/ratelimiter.js"

dotenv.config()
const PORT = process.env.PORT
const app = express()
app.use(ratelimiter)
app.use(express.json())
async function initDB(){
    try {
        await sql`CREATE TABLE IF NOT EXISTS transactions(
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10) NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
        )`;
        console.log("databse connected")
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

app.get("/",(req,res)=>{
    res.send("Its working")
})

app.get("/api/transactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const transactions = await sql`
        SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC
      `;

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error getting transactions:", error);
    res.status(500).json({
      message: "Error getting transactions",
    });
  }
});

app.post("/api/transactions",async (req,res)=>{
    try {
       const {title,amount,category,user_id} = req.body
       if(!title||amount===undefined||!category||!user_id){
        return res.status(400).json({
            message:"All fields are required"
        })
       }
       const transaction = await sql`
        INSERT INTO transactions(user_id,title,amount,category)
        VALUES (${user_id},${title},${amount},${category})
        RETURNING *
        `;
       res.status(200).json(transaction[0]);
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message:"Internal server error"
        })
    }
})

app.delete("/api/transactions/:id",async (req,res)=>{
    try {
        const {id} = req.params
        const result =  await sql`
        DELETE FROM transactions WHERE id=${id} RETURNING * 
        `
        if(isNaN(parseInt(id))){
            return res.status(400).json({
                message:"Invalid transaction id"
            })
        }
        if(result.length===0){
            res.status(404).json({
                message:"transaction not found"
            })
        }

        res.status(200).json({
            message:"Transaction deleted successfully"
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Error deleting the transaction",
        });
    }
})

app.get("/api/transactions/summary/:userId", async (req,res)=>{
  try {
    const {userId} = req.params
    const balanceResult = await sql`
    SELECT COALESCE(SUM(amount),0) as balance FROM transactions WHERE user_id=${userId} 
    `
    const IncomeResult = await sql`
    SELECT COALESCE(SUM(amount),0) as income FROM transactions
    WHERE user_id=${userId} AND amount>0
    `;
    const expenseResult = await sql`
    SELECT COALESCE(SUM(amount),0) as expenses FROM transactions
    WHERE user_id=${userId} AND amount<0
    `;
    res.status(200).json({
        balance:balanceResult[0].balance,
        income:IncomeResult[0].income,
        expense:expenseResult[0].expenses
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error getting summary",
    });
  }
})

initDB().then(()=>{
    app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);
    });
})