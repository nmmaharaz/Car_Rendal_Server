const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken')
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require('cookie-parser')

const corsOptions = {
  origin: ['http://localhost:5173', 'https://alta-car-rentals.web.app', 'https://alta-car-rentals.firebaseapp.com'],
  credentials: true,
  optionalSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vh6jx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next)=>{
  const token = req.cookies?.token
  if(!token) return res.status(401).send({message: 'unauthorized access'})
    jwt.verify(token, process.env.SECRET_KEY, (err, docoded)=>{
  if(err){
    return res.status(401).send({message:"unauthorized access"})
  }
req.user = docoded
    })
    next()
}
async function run() {
  try {
    const carCollection = client.db("AltaJobRentals").collection("car");
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    app.get('/logout', async (req, res) => {
      res
        .clearCookie('token', {
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    app.post("/addcar", async (req, res) => {
      const carData = req.body;
      const result = await carCollection.insertOne(carData);
      res.send(result);
    });
    app.delete("/addcar/:id",verifyToken,async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/cardeatails/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carCollection.findOne(query);
      res.send(result);
    });

    app.get("/cars/:available", async (req, res) => {
      const { search = "", sortDate, sortPrice } = req.query;
      let options = {};
      const available = req.params.available;;

      if (sortDate) options.date = sortDate === "asc" ? 1 : -1;
      if (sortPrice) options.rental_price = sortPrice === "asc" ? 1 : -1;
      let query = {
        car_model: {
          $regex: search,
          $options: "i",
        },

      };
      if (available !== undefined) query.availability = available;
      
      const result = await carCollection.find(query).sort(options).toArray();
      res.send(result);
    });
    app.get("/carsdata", async (req, res) => {
      let options = {date:  -1};
     
      const result = await carCollection.find().sort(options).limit(6).toArray();
      res.send(result);
    });

    app.get("/mycar/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await carCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/mycar/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateCarData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateData = {
        $set: updateCarData,
      };
      const result = await carCollection.updateOne(query, updateData);
      res.send(result);
    });

    // Book Mark Data
    const bookMarkCollection = client
      .db("AltaJobRentals")
      .collection("bookmarkcar");
    app.post("/bookmark", async (req, res) => {
      const bookMark = req.body;
      const query = {
        email: bookMark.email,
        book_mark_id: bookMark.book_mark_id,
      };
      const alreadyBooked = await bookMarkCollection.findOne(query);
      if (alreadyBooked) return res.status(400).send("Car Already Booked!");
      const result = await bookMarkCollection.insertOne(bookMark);
      const filter = { _id: new ObjectId(bookMark.book_mark_id) };
      const update = {
        $inc: { bookingCount: 1 },
      };
      await carCollection.updateOne(filter, update);
      res.send(result);
    });

    app.get("/bookmark/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bookMarkCollection.find(query).toArray();
      res.send(result);
    });
    app.patch("/bookmark/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateBookMark = req.body;
      const query = { _id: new ObjectId(id) };
      const updateData = {
        $set: updateBookMark,
      };
      const result = await bookMarkCollection.updateOne(query, updateData);
      res.send(result);
    });
    app.patch("/bookmarkstatusupdate/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const booking_status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateData = {
        $set: booking_status,
      };
      const result = await bookMarkCollection.updateOne(query, updateData);
      res.send(result);
    });
    app.delete("/bookmark/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookMarkCollection.deleteOne(query);
      res.send(result);
    });
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Alta Car Rentals");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

