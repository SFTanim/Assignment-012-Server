const express = require("express");
const cors = require("cors");
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

    // USERS
    app.get("/users", async (req, res) => {
      const allUser = await userCollection.find().toArray();
      res.send(allUser);
    });

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

    app.get("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(query);
      res.send(result);
    });

    app.post("/pets", async (req, res) => {
      const petInfo = req.body;
      const result = await petCollection.insertOne(petInfo);
      res.send(result);
    });

    // For user who wants to adopt
    app.post("/pets/:id", async (req, res) => {
      const adoptUser = req.body;
      const id = req.params.id;
      console.log(adoptUser, id);
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

    app.get("/myPets/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user: email };
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/myPets/:id", async (req, res) => {
      const petId = req.params.id;
      const query = { _id: new ObjectId(petId) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/myPets/:id", async (req, res) => {
      const myPetId = req.params.id;
      const myPet = req.body;
      const filter = { _id: new ObjectId(myPetId) };
      const options = { upsert: true };
      console.log(myPet, myPetId);
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

    app.delete("/pets/:id", async (req, res) => {
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

    // Donation
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

    app.post("/donations", async (req, res) => {
      const donationInfo = req.body;
      const result = await donationCollection.insertOne(donationInfo);
      res.send(result);
    });

    app.get("/donations/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user: email };
      const result = await donationCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/don/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCollection.findOne(query);
      res.send(result);
    });

    app.post("/donations/:id", async (req, res) => {
      const data = req.body;

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      console.log(data, id);
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
        console.log(data.newAmount);
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

    // My donated money:
    app.get("/myDonation/:email", async (req, res) => {
      const myEmail = req.params.email;
      const query = { "donatedPersons.email": myEmail };
      console.log(myEmail, query);

      const result = await donationCollection.find(query).toArray();
      res.send(result);
    });

    // Payment
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const totalAmount = parseInt(price * 100);
      if (totalAmount < 1) {
        return res.status(400).send({
          error: "The amount must be at least $0.50.",
        });
      }
      console.log("amount in payment intent:", totalAmount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Payment-Refund
    app.post("/paymentRefund", async (req, res) => {
      const { paymentId, amount, donationId,newValueForDonation } = req.body;
      console.log(newValueForDonation);
      console.log("datas:", paymentId, amount, donationId);
      if (!paymentId) {
        return res.status(400).send({ error: "PaymentIntent ID is required" });
      }

      const filter = {
        _id: new ObjectId(donationId),
        "donatedPersons.paymentIntentId": paymentId,
      };
      const resultFindOne = await donationCollection.findOne(filter);
      console.log(resultFindOne);

      const options = { upsert: true };
      const updateDoc = {
        $pull: {
          donatedPersons: { paymentIntentId: paymentId },
        },
        $set: {
          donatedMoney: newValueForDonation
        }
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
