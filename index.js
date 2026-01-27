require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

// middleware
app.use(cors())
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l8gdu91.mongodb.net/?appName=Cluster0`;




const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const db = client.db('e-tuition-bd');
        const usersCollection = db.collection('users')

        app.get('/', (req, res) => {
            res.send('E-Tuition-BD Server is Running!')
        })

        app.post("/users", async (req, res) => {
            const user = req.body;

            const filter = { email: user.email };

            const updateDoc = {
                $set: {
                    name: user.name || "",
                    phone: user.phone || "",
                    photoURL: user.photoURL || "",
                    lastLoginAt: new Date(),
                },
                $setOnInsert: {

                    role: user.role || "student",
                    createdAt: new Date(),
                    email: user.email,
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc, { upsert: true });

            res.send(result);
        });
        app.get("/users", async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });







        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})