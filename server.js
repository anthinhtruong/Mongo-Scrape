var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars")

// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");

mongoose.Promise = Promise;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static(__dirname + "public"));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Database configuration with mongoose

// if(process.env.NODE_ENV == 'production'){
// //   mongoose.connect('mongodb://heroku_60zpcwg0:ubn0n27pi2856flqoedo9glvh8@ds119578.mlab.com:19578/heroku_60zpcwg0');
// }
// else{
//   mongoose.connect('mongodb://localhost/mongoscape');
  
// }

var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});


// Routes
// ======
app.get("/", function(req,res){
    res.render("index")
   
})

// A GET request to scrape the echojs website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  request("https://www.nytimes.com/section/business/media?action=click&contentCollection=technology&region=navbar&module=collectionsnav&pagetype=sectionfront&pgtype=sectionfront", function(error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);

     var result = [];

    

    // Now, we grab every h2 within an article tag, and do the following:
    $(".story-body").each(function(i, element) {
        var story = {};

      // Add the text and href of every link, and save them as properties of the result object
      story.title = $(this).children().children(".story-meta").children("h2").text().trim()
      story.author = $(this).children().children(".story-meta").children(".byline").text().trim()
      story.link = $(this).children("a").attr("href");
      
      console.log("=======================")
      console.log("TITLEEEEE" + story.title)
      console.log("LINKKKKK" + story.link)
      console.log("AUTHHOOOORR" + story.author)
      console.log("--------------------")
      console.log(result)

      result.push(story)
      // Using our Article model, create a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });

    });
  });
  // Tell the browser that we finished scraping the text
  res.redirect("/articles");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  Article.find({}, function(error,doc){
    if (error) {
      res.send(error);
    }
    
    else {
      res.render("index", doc);
    }
  });

  


});

// This will grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  
  Article.find().sort({_id: -1})

  .populate("note")
  .exec(function(error, doc) {
     
      if (error) {
        res.send(error);
      }
     
      else {
        var articleS = {articles: doc}
        res.render("index",articleS);
      }

})
})
  
// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  var newNote = new Note (req.body)

  newNote.save(function(err,doc){
      if (err) {
      res.send(err);
    }
   
    else {
      Article.findOneAndUpdate({ObjectId:req.param.id},{ $push: { "note": doc._id } },{ new: true },function(error, doc){
        
        if (error) {
          res.send(error);
        }
       
        else {
          res.send(doc);
        }
      })

    }

  })
 });   
      

  
  
var port = process.env.PORT || 3000;

app.listen(port, function(){
  console.log('Running on port: ' + port);
});
