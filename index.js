const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

require("dotenv").config();
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9sxzsr9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // DatabaseCollections
    const userCollection = client.db("assignment-12").collection("users");
    const petCollection = client.db("assignment-12").collection("pets");
    const donationCollection = client
      .db("assignment-12")
      .collection("donations");

    // MIDDLEWARES
    // VERIFY TOKEN
    const verifyToken = (req, res, next) => {
      // req.headers.authorization comes from client site like useAxiosSecure file
      console.log("Inside verify token: ", req?.headers?.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access!" });
      }
      const token = req.headers.authorization.split(" ")[1];
      console.log(token);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "Unauthorized Access!" });
        }
        res.decoded = decoded;
        next();
      });
    };

    // JWT Related API (Pass the token in client site)
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.send({ token });
    });

    // MAKE A USER ADMIN
    app.post("/makeAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const option = { upsert: true };
      const filter = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    // BAN A USER
    app.post("/userBan/:id", async (req, res) => {
      const id = req.params.id;
      const option = { upsert: true };
      const filter = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: {
          ban: true,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    // USER ADMIN
    app.get("/user/admin/:email", verifyToken, async(req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // USERS
    app.get("/users", async (req, res) => {
      const allUser = await userCollection.find().toArray();
      res.send(allUser);
    });

   app.get("/users/:email", async(req,res)=>{
    const email = req.params.email
    console.log(email);
    const query = {email: email}
    const result= await userCollection.findOne(query)
    res.send(result)
   })

    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const query = { email: userInfo.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({
          message: "User Email Already Exists",
          insertedId: null,
        });
      }
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });

    // PETS
    app.get("/pets", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    app.get("/pets/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(query);
      res.send(result);
    });

    app.post("/pets", verifyToken, async (req, res) => {
      const petInfo = req.body;
      const result = await petCollection.insertOne(petInfo);
      res.send(result);
    });

    // For user who wants to adopt
    app.post("/pets/:id", verifyToken, async (req, res) => {
      const adoptUser = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          adoptUser: adoptUser,
        },
      };
      const option = { upsert: true };

      const result = await petCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    app.get("/myPets/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { user: email };
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/myPets/:id", verifyToken, async (req, res) => {
      const petId = req.params.id;
      const query = { _id: new ObjectId(petId) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/myPets/:id", verifyToken, async (req, res) => {
      const myPetId = req.params.id;
      const myPet = req.body;
      const filter = { _id: new ObjectId(myPetId) };
      const options = { upsert: true };
      if (myPet.name) {
        const updateDoc = {
          $set: {
            name: myPet.name,
            breed: myPet.breed,
            age: myPet.age,
            image: myPet.image,
            location: myPet.location,
            category: myPet.category,
            shortDescription: myPet.shortDescription,
            longDescription: myPet.longDescription,
          },
        };
        const result = await petCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        return res.send(result);
      }
      if (myPet.adopt) {
        const updateDoc = {
          $set: {
            adopt: myPet.adopt,
          },
        };
        const result = await petCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        return res.send(result);
      }
      const result = await petCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.delete("/pets/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateData = {
        $unset: {
          adoptUser: "",
        },
      };
      const result = await petCollection.updateOne(filter, updateData, options);
      res.send(result);
    });

    // DONATIONS
    app.get("/donations", async (req, res) => {
      const result = await donationCollection.find().toArray();
      res.send(result);
    });

    app.get("/donationsBySorting", async (req, res) => {
      const result = await donationCollection
        .find({})
        .sort({ creationDate: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/donations", verifyToken, async (req, res) => {
      const donationInfo = req.body;
      const result = await donationCollection.insertOne(donationInfo);
      res.send(result);
    });

    app.get("/donations/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { user: email };
      const result = await donationCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/don/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCollection.findOne(query);
      res.send(result);
    });

    app.post("/donations/:id", verifyToken, async (req, res) => {
      const data = req.body;

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      if (data.name) {
        const updateDoc = {
          $set: {
            name: data?.name,
            image: data?.image,
            shortDescription: data?.shortDescription,
            longDescription: data?.longDescription,
            maxDonation: data?.maxDonation,
            lastDate: data?.lastDate,
            canDonate: data?.canDonate,
          },
        };
        const result = await donationCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        return res.send(result);
      }

      if (data.donatedUser) {
        const updateDoc = {
          $push: {
            donatedPersons: data.donatedUser,
          },
          $set: {
            donatedMoney: data.newAmount,
          },
        };
        const result = await donationCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        return res.send(result);
      } else {
        const updateDoc = {
          $set: {
            canDonate: data.canDonate,
          },
        };
        const result = await donationCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        return res.send(result);
      }
    });

    // MY DONATED MONEY
    app.get("/myDonation/:email", verifyToken, async (req, res) => {
      const myEmail = req.params.email;
      const query = { "donatedPersons.email": myEmail };

      const result = await donationCollection.find(query).toArray();
      res.send(result);
    });

    // PAYMENT
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const totalAmount = parseInt(price * 100);
      if (totalAmount < 1) {
        return res.status(400).send({
          error: "The amount must be at least $0.50.",
        });
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // PAYMENT-REFUND
    app.post("/paymentRefund", async (req, res) => {
      const { paymentId, amount, donationId, newValueForDonation } = req.body;

      if (!paymentId) {
        return res.status(400).send({ error: "PaymentIntent ID is required" });
      }

      const filter = {
        _id: new ObjectId(donationId),
        "donatedPersons.paymentIntentId": paymentId,
      };
      const resultFindOne = await donationCollection.findOne(filter);

      const options = { upsert: true };
      const updateDoc = {
        $pull: {
          donatedPersons: { paymentIntentId: paymentId },
        },
        $set: {
          donatedMoney: newValueForDonation,
        },
      };

      const refund = await stripe.refunds.create({
        payment_intent: paymentId,
        amount: amount,
      });

      const result = await donationCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Assignment-012 Server Running");
});

app.listen(port, () => {
  console.log("Assignment-012 is running on port: ", port);
});
