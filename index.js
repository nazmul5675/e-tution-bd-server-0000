require('dotenv').config();
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);





// middleware 
app.use(cors());
app.use(express.json());


const admin = require("./firebaseAdmin");

const verifyFirebaseToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

        if (!token) return res.status(401).send({ message: "Unauthorized" });

        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
    } catch (err) {
        return res.status(401).send({ message: "Invalid token" });
    }
};



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
        const paymentsCollection = db.collection("payments");
        const contactsCollection = db.collection("contacts");


        const verifyRole = (role) => {
            return async (req, res, next) => {
                try {
                    const email = req.decoded?.email;
                    if (!email) return res.status(401).send({ message: "Unauthorized" });

                    const user = await usersCollection.findOne({ email });
                    if (!user) return res.status(403).send({ message: "Forbidden" });

                    if (user.role !== role) return res.status(403).send({ message: "Forbidden" });

                    next();
                } catch (err) {
                    return res.status(500).send({ message: "Role check failed" });
                }
            };
        };







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

        // admin api dash board api 
        app.patch("/users/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid user id" });

                const { name, phone, photoURL, role, status, isVerified } = req.body;

                const updateDoc = {
                    $set: {
                        ...(name !== undefined ? { name: name.trim() } : {}),
                        ...(phone !== undefined ? { phone: phone.trim() } : {}),
                        ...(photoURL !== undefined ? { photoURL } : {}),
                        ...(role !== undefined ? { role } : {}),                // "student" | "tutor" | "admin"
                        ...(status !== undefined ? { status } : {}),            // "active" | "blocked"
                        ...(isVerified !== undefined ? { isVerified: !!isVerified } : {}),
                        updatedAt: new Date(),
                    },
                };

                const result = await usersCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
                if (result.matchedCount === 0) return res.status(404).send({ message: "User not found" });

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to update user" });
            }
        });
        app.delete("/users/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid user id" });

                const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) return res.status(404).send({ message: "User not found" });

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to delete user" });
            }
        });
        app.get("/users/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid user id" });

                const user = await usersCollection.findOne({ _id: new ObjectId(id) });
                if (!user) return res.status(404).send({ message: "User not found" });

                res.send(user);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load user" });
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

        // Get single tuition 
        app.get("/tuitions/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid tuition id" });

                const doc = await tuitionsCollection.findOne({ _id: new ObjectId(id) });
                if (!doc) return res.status(404).send({ message: "Tuition not found" });

                res.send(doc);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load tuition" });
            }
        });

        //  Admin approve/reject tuition post
        app.patch("/tuitions/:id/status", async (req, res) => {
            try {
                const id = req.params.id;
                const { status } = req.body; // "approved" | "rejected" | "pending"

                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid tuition id" });

                const next = (status || "").toLowerCase().trim();
                if (!["approved", "rejected", "pending"].includes(next)) {
                    return res.status(400).send({ message: "Invalid status. Use approved/rejected/pending" });
                }

                const updateDoc = {
                    $set: {
                        status: next,
                        updatedAt: new Date(),
                        ...(next === "approved" ? { approvedAt: new Date() } : {}),
                        ...(next === "rejected" ? { rejectedAt: new Date() } : {}),
                    },
                };

                const result = await tuitionsCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);

                if (result.matchedCount === 0) return res.status(404).send({ message: "Tuition not found" });

                res.send({ message: "Status updated", result });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to update status" });
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
        app.patch("/applications/:id/reject", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid id" });

                const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(id) });
                if (!appDoc) return res.status(404).send({ message: "Application not found" });

                if ((appDoc.status || "").toLowerCase() !== "pending") {
                    return res.status(403).send({ message: "Only pending applications can be rejected" });
                }

                const result = await applicationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "rejected", updatedAt: new Date() } }
                );

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to reject application" });
            }
        });
        app.patch("/applications/:id/approve", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid id" });

                const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(id) });
                if (!appDoc) return res.status(404).send({ message: "Application not found" });

                if ((appDoc.status || "").toLowerCase() !== "pending") {
                    return res.status(403).send({ message: "Only pending applications can be approved" });
                }

                // approve this application
                await applicationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "approved", updatedAt: new Date() } }
                );

                // OPTIONAL: reject other pending applications for same tuition
                await applicationsCollection.updateMany(
                    { tuitionId: appDoc.tuitionId, _id: { $ne: new ObjectId(id) }, status: "pending" },
                    { $set: { status: "rejected", updatedAt: new Date() } }
                );

                res.send({ message: "Approved successfully" });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to approve application" });
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

        // Create Checkout Session
        app.post("/payments/create-checkout-session", async (req, res) => {
            try {
                const { applicationId, studentEmail } = req.body;

                if (!applicationId) return res.status(400).send({ message: "applicationId is required" });
                if (!ObjectId.isValid(applicationId)) return res.status(400).send({ message: "Invalid applicationId" });

                const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(applicationId) });
                if (!appDoc) return res.status(404).send({ message: "Application not found" });

                //only that student can pay/approve
                //Later replace with JWT verification
                const emailToMatch = studentEmail || appDoc.studentEmail;
                if (emailToMatch !== appDoc.studentEmail) {
                    return res.status(403).send({ message: "Unauthorized" });
                }

                if ((appDoc.status || "").toLowerCase() !== "pending") {
                    return res.status(400).send({ message: "Only pending applications can be paid/approved" });
                }

                const amountBDT = Number(appDoc.expectedSalary || 0);
                if (amountBDT <= 0) return res.status(400).send({ message: "Invalid expectedSalary" });


                const session = await stripe.checkout.sessions.create({
                    mode: "payment",
                    payment_method_types: ["card"],
                    customer_email: appDoc.studentEmail,
                    line_items: [
                        {
                            quantity: 1,
                            price_data: {
                                currency: "bdt",
                                unit_amount: Math.round(amountBDT * 100),
                                product_data: {
                                    name: `Tuition payment - ${appDoc?.tuitionSnapshot?.subject || "Tuition"}`,
                                },
                            },
                        },
                    ],
                    metadata: {
                        applicationId: appDoc._id.toString(),
                        tuitionId: appDoc.tuitionId,
                        studentEmail: appDoc.studentEmail,
                        tutorEmail: appDoc.tutorEmail,
                    },
                    success_url: `${process.env.CLIENT_URL}/dashboard/payments?success=1&session_id={CHECKOUT_SESSION_ID}&applicationId=${appDoc._id}`,
                    cancel_url: `${process.env.CLIENT_URL}/dashboard/payments?canceled=1&applicationId=${appDoc._id}`,
                });
                console.log("CLIENT_URL =", process.env.CLIENT_URL);
                res.send({ url: session.url });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to create checkout session" });
            }
        });

        app.post("/payments/confirm", async (req, res) => {
            try {
                const { session_id, applicationId } = req.body;

                if (!session_id) return res.status(400).send({ message: "session_id required" });
                if (!applicationId || !ObjectId.isValid(applicationId))
                    return res.status(400).send({ message: "Valid applicationId required" });

                //  verify session in Stripe
                const session = await stripe.checkout.sessions.retrieve(session_id);

                if (session.payment_status !== "paid") {
                    return res.status(400).send({ message: "Payment not completed" });
                }

                const appDoc = await applicationsCollection.findOne({ _id: new ObjectId(applicationId) });
                if (!appDoc) return res.status(404).send({ message: "Application not found" });

                //  prevent double confirm
                if ((appDoc.status || "").toLowerCase() === "approved") {
                    return res.send({ message: "Already approved" });
                }

                // approve application
                await applicationsCollection.updateOne(
                    { _id: new ObjectId(applicationId) },
                    { $set: { status: "approved", updatedAt: new Date(), approvedAt: new Date() } }
                );

                // reject others for same tuition
                await applicationsCollection.updateMany(
                    { tuitionId: appDoc.tuitionId, _id: { $ne: new ObjectId(applicationId) }, status: "pending" },
                    { $set: { status: "rejected", updatedAt: new Date() } }
                );

                // mark tuition ongoing
                await tuitionsCollection.updateOne(
                    { _id: new ObjectId(appDoc.tuitionId) },
                    {
                        $set: {
                            assignedTutorEmail: appDoc.tutorEmail,
                            assignedTutorName: appDoc.tutorName,
                            assignedTutorPhoto: appDoc.tutorPhoto || "",
                            ongoing: true,
                            updatedAt: new Date(),
                        },
                    }
                );

                // save payment record
                await paymentsCollection.insertOne({
                    applicationId,
                    tuitionId: appDoc.tuitionId,
                    studentEmail: appDoc.studentEmail,
                    tutorEmail: appDoc.tutorEmail,
                    amount: session.amount_total, // this is in paisa
                    currency: session.currency,
                    stripeSessionId: session.id,
                    paymentStatus: session.payment_status,
                    createdAt: new Date(),
                });

                res.send({ message: "Payment confirmed & approved" });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to confirm payment" });
            }
        });


        //  Get single application
        app.get("/applications/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid id" });

                const doc = await applicationsCollection.findOne({ _id: new ObjectId(id) });
                if (!doc) return res.status(404).send({ message: "Application not found" });
                res.send(doc);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load application" });
            }
        });

        //  Revenue history
        app.get("/payments", async (req, res) => {
            try {
                const { tutorEmail, studentEmail } = req.query;
                const query = {};
                if (tutorEmail) query.tutorEmail = tutorEmail;
                if (studentEmail) query.studentEmail = studentEmail;

                const result = await paymentsCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load payments" });
            }
        });
        //  Contact messages
        app.post("/contacts", async (req, res) => {
            try {
                const { name, email, message } = req.body;

                //  Basic validation
                if (!name?.trim()) return res.status(400).send({ message: "Name is required" });
                if (!email?.trim()) return res.status(400).send({ message: "Email is required" });
                if (!message?.trim()) return res.status(400).send({ message: "Message is required" });

                const doc = {
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    message: message.trim(),
                    status: "new",
                    createdAt: new Date(),
                };

                const result = await contactsCollection.insertOne(doc);

                res.send({ insertedId: result.insertedId, message: "Message saved" });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to save contact message" });
            }
        });
        //  Get all contact messages (Admin)
        app.get("/contacts", async (req, res) => {
            try {
                const { status } = req.query;

                const query = {};
                if (status) query.status = status; // new / seen / replied

                const result = await contactsCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to load contact messages" });
            }
        });
        //  Update message status (Admin)
        app.patch("/contacts/:id/status", async (req, res) => {
            try {
                const id = req.params.id;
                const { status } = req.body;

                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid id" });

                const next = (status || "").toLowerCase().trim();
                if (!["new", "seen", "replied"].includes(next)) {
                    return res.status(400).send({ message: "Invalid status: use new/seen/replied" });
                }

                const result = await contactsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: next, updatedAt: new Date() } }
                );

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to update message status" });
            }
        });
        //  Delete contact message (Admin)
        app.delete("/contacts/:id", async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid id" });

                const result = await contactsCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Failed to delete message" });
            }
        });



        app.get("/auth/check", verifyFirebaseToken, (req, res) => {
            res.send({
                ok: true,
                email: req.decoded.email,
                uid: req.decoded.uid,
            });
        });



















        console.log("Server routes ready");



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