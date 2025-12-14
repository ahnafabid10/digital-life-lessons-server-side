const express = require('express')
var cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SECRET);


const port = process.env.PORT || 3000


// middleware
app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h1evre0.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('Life is going furut furut')
})

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("digital_life_lessons");
    const lessonsCollection = database.collection("lessons");
    const usersCollection = database.collection("users");

    //payment related api
    app.post('/create-checkout-session', async (req, res) => {
      const paymentInfo = req.body;
      // const amount = parseInt(paymentInfo.cost)*100
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, price_1234) of the product you want to sell
        price_data:{
          currency: 'USD',
          unit_amount: 1500 * 100,
          // unit_amount: amount

          product_data:{
            name: "Premium Plan"
          }
        },
        quantity: 1,
      },
    ],
    customer_email: paymentInfo.email,
    mode: 'payment',
    success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success`,
    cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
  });

  // res.redirect(303, session.url);
  res.send({url: session.url})
});

    // users api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user)
      res.send(result);
    })

    app.get('/users',  async (req, res) => {
      const query = {}
      const {email} = req.query;
      if(email){
        query.email = email;
      }

      if(id){
        query._id  = new ObjectId(id)
      }

      const cursor = await usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);

    })

    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await usersCollection.findOne(query);
      res.send(result);
    });



    // lessons api
    app.get('/lessons', async (req, res) => {
      const query = {};

      const {email} = req.query;

      if(email){
        query.email = email;
      }

      const options = { sort: {createdAt: -1}}

      const cursor = lessonsCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });



    app.post('/lessons', async (req, res) => {
      const lesson = req.body;
      
      lesson.createAt= new Date();
      const result = await lessonsCollection.insertOne(lesson)
      res.send(result);
    })


    app.delete('/lessons/:id', async (req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await lessonsCollection.deleteOne(query);
      res.send(result);
    })



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
  console.log(`Example app listening on port ${port}`)
})
