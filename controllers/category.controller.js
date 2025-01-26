const Category = require("../models/category.model");
const Question = require("../models/question.model");
const Result = require("../models/result.model");
const asyncHandler = require("express-async-handler");

const create = asyncHandler(async function (req, res) {
    const { name } = req.body;
    try {
        const categoryExists = await Category.findOne({ name });
        if (categoryExists) {
            return res.status(500).json({ status: false, message: "Category Already Present" });
        }
        const category = await Category.create({ name });
        return res.status(200).json({ status: true, message: "Category Created", data: category });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
});

const getCategories = asyncHandler(async (req, res) => {
    try {
        let categories = await Category.find();
        // Use Promise.all to wait for all async operations inside the map function
        categories = await Promise.all(categories.map(async (category) => {
            // Count the number of documents in Result that match the category_id
            const totalResults = await Result.countDocuments({ category_id: category._id });
            const totalQuestions = await Question.countDocuments({ category_id: category._id });
            // Add total to category object
            return { ...category.toObject(), total: totalResults, totalQuestions };  // Converting to plain object
        }));


        return res.status(200).json({ status: true, message: "Categories Found", data: categories });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
});


const getCategory = asyncHandler(async (req, res) => {
    const { category_id } = req.params;
    try {
        const category = await Category.findById(category_id);  // Fix: use findById
        if (!category) {
            return res.status(404).json({ status: false, message: "Category Not Found" });
        }
        return res.status(200).json({ status: true, message: "Category Found", data: category });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
});

module.exports = { create, getCategories, getCategory };
