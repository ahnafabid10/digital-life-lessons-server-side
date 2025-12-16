const express = require('express')
var cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SECRET);


const port = process.env.PORT || 3000

function generateTrackingId() {
  const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `PK-${date}-${random}`;
}


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
    const paymentsCollection = database.collection("payments");

    //payment related api
    app.post('/create-checkout-session', async (req, res) => {
      const paymentInfo = req.body;
      // const amount = parseInt(paymentInfo.cost)*100
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, price_1234) of the product you want to sell
        price_data:{
          currency: 'BDT',
          unit_amount: 1500 * 100,
          // unit_amount: amount

          product_data:{
            name: "Premium Plan"
          }
        },
        quantity: 1,
      },
    ],
    customer_email: paymentInfo.buyerEmail,
    mode: 'payment',
    metadata: {
      userId: paymentInfo.userId,
      name: "Premium Plan"
    },
    success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
  });

  // res.redirect(303, session.url);
  res.send({url: session.url})
});



    app.patch('/payment-success',  async (req, res) => {
    const sessionId = req.query.session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(session);

    const transactionId = session.payment_intent;
    const query = {transactionId: transactionId};

    const paymentExists = await paymentsCollection.findOne(query);
    if(paymentExists){
      return res.send({
        success: true, 
        message: 'Payment already processed',
      transactionId,
      trackingId: paymentExists.trackingId
      })
    }

      const trackingId = generateTrackingId();

    if(session.payment_status === 'paid'){
      const id = session.metadata.userId;
      const query = {_id: new ObjectId(id)};
      const update = {
        $set: {
          isPremium: true,
          trackingId: trackingId,
        },
      };
      const result = await usersCollection.updateOne(query, update);

      const payment = {
        amount: session.amount_total / 100,
        currency: session.currency,
        customer_email: session.customer_email,
        userId: session.metadata.userId,
        name: session.metadata.name,
        transactionId: session.payment_intent,
        payment_status: session.payment_status,
        paidAt: new Date(),
        
      }

      if(session.payment_status === 'paid'){
        const resultPayment = await paymentsCollection.insertOne(payment);
        res.send({
          success: true, 
          modifyParcel: result,
          transactionId: session.payment_intent,
          trackingId: trackingId,
          paymentInfo: resultPayment}) 
      }



    }

    res.send({success: false})
    })


    //payment get api
    app.get('/payments',  async (req, res) => {
      const email = req.query.email;
      const query ={}
      if(email){
        query.customer_email = email;
      }

      const cursor = paymentsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
      
    })




    // users api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user)
      res.send(result);
    })

    app.get('/users',  async (req, res) => {
      const query = {}
      const {email, id} = req.query;
      if(email){
        query.email = email;
      }

      if(id){
        query._id  = new ObjectId(id)
      }

      const cursor = usersCollection.find(query);
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
