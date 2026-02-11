require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const usersCollection = db.collection('users');
        const tuitionsCollection = db.collection('tuitions');
        const applicationsCollection = db.collection("applications");

        app.get('/', (req, res) => {
            res.send('E-Tuition-BD Server is Running!')
        })
        // users api
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
        app.get("/users/profile", async (req, res) => {
            try {
                const email = req.query.email;
                if (!email) return res.status(400).send({ message: "email is required" });

                const user = await usersCollection.findOne(
                    { email },
                    { projection: { name: 1, email: 1, phone: 1, photoURL: 1, role: 1, createdAt: 1, updatedAt: 1 } }
                );

                if (!user) return res.status(404).send({ message: "User not found" });
                res.send(user);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load profile" });
            }
        });
        app.patch("/users/profile", async (req, res) => {
            try {
                const email = req.query.email;
                const { name, phone, photoURL } = req.body;

                if (!email) return res.status(400).send({ message: "email is required" });
                if (!name?.trim()) return res.status(400).send({ message: "name is required" });

                const updateDoc = {
                    $set: {
                        name: name.trim(),
                        phone: phone?.trim() || "",
                        ...(photoURL ? { photoURL } : {}),
                        updatedAt: new Date(),
                    },
                };

                const result = await usersCollection.updateOne({ email }, updateDoc);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "User not found" });
                }

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to update profile" });
            }
        });



        // tuitions api
        app.post("/tuitions", async (req, res) => {
            try {
                const data = req.body;

                // Basic validation 
                const required = ["subject", "classLevel", "location", "schedule", "budget", "studentEmail"];
                for (const key of required) {
                    if (!data?.[key]) {
                        return res.status(400).send({ message: `${key} is required` });
                    }
                }

                const tuitionDoc = {
                    subject: data.subject,
                    classLevel: data.classLevel,
                    location: data.location,
                    schedule: data.schedule,
                    daysPerWeek: Number(data.daysPerWeek || 0),
                    budget: Number(data.budget || 0),
                    preferredTutorGender: data.preferredTutorGender || "Any",
                    note: data.note || "",

                    // student info
                    studentName: data.studentName || "",
                    studentEmail: data.studentEmail,
                    studentPhoto: data.studentPhoto || "",
                    status: "pending",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                const result = await tuitionsCollection.insertOne(tuitionDoc);
                res.send({ insertedId: result.insertedId });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to post tuition" });
            }
        })
        app.get("/tuitions", async (req, res) => {
            try {
                const { studentEmail, status } = req.query;

                const query = {};
                if (studentEmail) query.studentEmail = studentEmail;
                if (status) query.status = status; // pending/approved/rejected

                const result = await tuitionsCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load tuitions" });
            }
        });
        app.patch("/tuitions/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid tuition id" });
                }


                const updateDoc = {
                    $set: {
                        subject: updatedData.subject,
                        classLevel: updatedData.classLevel,
                        location: updatedData.location,
                        schedule: updatedData.schedule,
                        daysPerWeek: Number(updatedData.daysPerWeek || 0),
                        budget: Number(updatedData.budget || 0),
                        preferredTutorGender: updatedData.preferredTutorGender || "Any",
                        note: updatedData.note || "",
                        updatedAt: new Date(),
                    },
                };

                const result = await tuitionsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    updateDoc
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Tuition not found" });
                }

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to update tuition" });
            }
        });

        app.delete("/tuitions/:id", async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid tuition id" });
                }

                const result = await tuitionsCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Tuition not found" });
                }

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to delete tuition" });
            }
        });

        // applicationsCollection api
        app.post("/applications", async (req, res) => {
            try {
                const data = req.body;

                const required = ["tuitionId", "tutorEmail", "tutorName", "qualifications", "experience", "expectedSalary"];
                for (const key of required) {
                    if (!data?.[key]) return res.status(400).send({ message: `${key} is required` });
                }

                if (!ObjectId.isValid(data.tuitionId)) {
                    return res.status(400).send({ message: "Invalid tuitionId" });
                }

                const tuition = await tuitionsCollection.findOne({ _id: new ObjectId(data.tuitionId) });
                if (!tuition) return res.status(404).send({ message: "Tuition not found" });

                // only approved tuitions are apply-able
                if ((tuition.status || "").toLowerCase() !== "approved") {
                    return res.status(403).send({ message: "This tuition is not available for application" });
                }

                // prevent duplicate apply
                const exists = await applicationsCollection.findOne({
                    tuitionId: tuition._id.toString(),
                    tutorEmail: data.tutorEmail,
                });
                if (exists) return res.status(409).send({ message: "You already applied to this tuition" });

                const appDoc = {
                    tuitionId: tuition._id.toString(),

                    tuitionSnapshot: {
                        subject: tuition.subject,
                        classLevel: tuition.classLevel,
                        location: tuition.location,
                        schedule: tuition.schedule,
                        budget: tuition.budget,
                    },

                    studentEmail: tuition.studentEmail,
                    studentName: tuition.studentName || "",
                    tutorEmail: data.tutorEmail,
                    tutorName: data.tutorName,
                    tutorPhoto: data.tutorPhoto || "",

                    qualifications: data.qualifications,
                    experience: data.experience,
                    expectedSalary: Number(data.expectedSalary),

                    status: "pending", // pending/approved/rejected
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                const result = await applicationsCollection.insertOne(appDoc);
                res.send({ insertedId: result.insertedId });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to apply" });
            }
        });
        app.get("/applications", async (req, res) => {
            try {
                const { tutorEmail, studentEmail, tuitionId, status } = req.query;

                const query = {};
                if (tutorEmail) query.tutorEmail = tutorEmail;
                if (studentEmail) query.studentEmail = studentEmail;
                if (tuitionId) query.tuitionId = tuitionId;
                if (status) query.status = status;

                const result = await applicationsCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load applications" });
            }
        });
        app.patch("/applications/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const { qualifications, experience, expectedSalary } = req.body;

                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid id" });

                const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(id) });
                if (!appDoc) return res.status(404).send({ message: "Application not found" });

                if ((appDoc.status || "").toLowerCase() !== "pending") {
                    return res.status(403).send({ message: "Approved/Rejected applications cannot be edited" });
                }

                const updateDoc = {
                    $set: {
                        ...(qualifications ? { qualifications } : {}),
                        ...(experience ? { experience } : {}),
                        ...(expectedSalary !== undefined ? { expectedSalary: Number(expectedSalary) } : {}),
                        updatedAt: new Date(),
                    },
                };

                const result = await applicationsCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to update application" });
            }
        });
        app.delete("/applications/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid id" });

                const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(id) });
                if (!appDoc) return res.status(404).send({ message: "Application not found" });

                if ((appDoc.status || "").toLowerCase() !== "pending") {
                    return res.status(403).send({ message: "Approved/Rejected applications cannot be deleted" });
                }

                const result = await applicationsCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to delete application" });
            }
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