
/*********************************************************************************
*  WEB322 – Assignment 04
*  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part *  of this assignment has been copied manually or electronically from any other source 
*  (including 3rd party web sites) or distributed to other students.
* 
*  Name:; mohammed abilail Student ID: 1440103208 Date: _2022-12-10
*
*  Online (Cyclic) Link: https://teal-impossible-caridea.cyclic.app/
*
********************************************************************************/



const express = require("express")
const productService = require('./product-service.js')
const path = require("path")
const app = express()

 var HTTP_PORT = process.env.PORT || 8080

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const upload = multer(); 
const exphbs = require("express-handlebars");
const stripJs = require("strip-js");

cloudinary.config({
  cloud_name: '1440103208',
   api_key: '252944672212866',
   api_secret: 'tWTnPNC4fxDtrhxyu4PEBsfNjgo',
   secure: true
 });

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
      navLink: function (url, options) {
        return (
          "<li" +
          (url == app.locals.activeRoute ? ' class="active" ' : "") +
          '><a href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        );
      },
      equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
          throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      },
      safeHTML: function (context) {
        return stripJs(context);
      },
      formatDate: function(dateObj){
        let year = dateObj.getFullYear();
        let month = (dateObj.getMonth() + 1).toString();
        let day = dateObj.getDate().toString();
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
    },
    },
  })
);
app.set("view engine", ".hbs");

var productSrv = require("./product-service");
const { get } = require("http");

var HTTP_PORT = process.env.PORT || 8080;

function onHttpStart() {
  console.log("Express http server listening on: " + HTTP_PORT);
  return new Promise(function (res, req) {
    productSrv
      .initialize()
      .then(function (data) {
        console.log(data);
      })
      .catch(function (err) {
        console.log(err);
      });
  });
}

app.use(function (req, res, next) {
  let route = req.path.substring(1);
  app.locals.activeRoute =
    "/" +
    (isNaN(route.split("/")[1])
      ? route.replace(/\/(?!.*)/, "")
      : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

app.use(express.static("public"));

app.get("/", function (req, res) {
  res.render(path.join(__dirname + "/views/home.hbs"));
});

app.get("/home", function (req, res) {
  res.render(path.join(__dirname + "/views/home.hbs"));
});

app.get("/products/add", function (req, res) {
  productSrv
    .getCategories()
    .then((data) => res.render("addProduct", { categories: data }))
    .catch((err) => res.render("addProduct", { categories: [] }));
});

app.get("/categories/add", function (req, res) {
  res.render(path.join(__dirname + "/views/addCategory.hbs"));
});

app.post("/products/add", upload.single("featureImage"), function (req, res) {
  let streamUpload = (req) => {
    return new Promise((resolve, reject) => {
      let stream = cloudinary.uploader.upload_stream((error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      });

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
  };

  async function upload(req) {
    let result = await streamUpload(req);
    console.log(result);
    return result;
  }

  upload(req).then((uploaded) => {
    req.body.featureImage = uploaded.url;
  });
  productSrv.addProduct(req.body).then(() => {
    res.redirect("/demos"); 
  });
});

app.post("/categories/add", (req, res) => {
  productSrv.addCategory(req.body).then(() => {
    res.redirect("/categories");
  });
});

app.get("/categories/delete/:id", (req, res) => {
  productSrv
    .deleteCategoryById(req.params.id)
    .then(res.redirect("/categories"))
    .catch((err) =>
      res.status(500).send("Unable to Remove Category / Category not found")
    );
});

app.get("/demos/delete/:id", (req, res) => {
  productSrv
    .deleteProductById(req.params.id)
    .then(res.redirect("/demos"))
    .catch((err) =>
      res.status(500).send("Unable to Remove Product / Product not found")
    );
});

app.get("/product", async (req, res) => {
  let viewData = {};

  try {
    let products = [];

    if (req.query.category) {
      
      products = await productSrv.getPublishedProductsByCategory(
        req.query.category
      );
    } else {
      products = await productSrv.getPublishedProducts();
    }

    products.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    let product = products[0];

    viewData.products = products;
    viewData.product = product;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    let categories = await productSrv.getCategories();

    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }
  res.render("product", { data: viewData });
});

app.get("/product/:id", async (req, res) => {
  let viewData = {};
  try {
    let products = [];
    if (req.query.category) {
      products = await productSrv.getPublishedProductsByCategory(
        req.query.category
      );
    } else {
      products = await productSrv.getPublishedProducts();
    }
    products.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    viewData.products = products;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    viewData.product = await productSrv.getProductById(req.params.id);
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    let categories = await productSrv.getCategories();

    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }

  res.render("product", { data: viewData });
});

app.get("/products", function (req, res) {
  productSrv
    .getPublishedProducts()
    .then(function (data) {
      res.render("product", { product: data });
    })
    .catch(function (err) {
      res.render({ message: err });
    });
});

app.get("/demos", (req, res) => {
  if (req.query.category) {
    productSrv
      .getProductByCategory(req.query.category)
      .then((data) => {
        res.render("demos", { products: data });
      })
      .catch((err) => {
        res.render("demos", { message: "no results" });
      });
  } else {
    productSrv
      .getAllProducts()
      .then((data) => {
        res.render("demos", { products: data });
      })
      .catch(function (err) {
        res.render("demos", { message: "no results" });
      });
  }
});
app.get("/categories", function (req, res) {
  if (req.query.category) {
    productSrv
      .getProductByCategory(req.query.category)
      .then((data) => {
        res.render("categories", { categories: data });
      })
      .catch((err) => {
        res.render("categories", { message: "no results" });
      });
  } else {
    productSrv
      .getCategories()
      .then(function (data) {
        res.render("categories", { categories: data });
      })
      .catch(function (err) {
        res.render("categories", { message: "no results" });
      });
  }
});

app.get("/product/:value", function (req, res) {
  productSrv
    .getProductById(req.params.value)
    .then(function (data) {
      res.render(data);
    })
    .catch(function (err) {
      res.render({ message: err });
    });
});

app.use(function (req, res) {
  res.status(404).render(path.join(__dirname, "/views/404.hbs"));
});

app.use(express.urlencoded({ extended: true }));

app.listen(HTTP_PORT, onHttpStart);
