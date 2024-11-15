const Style = require("../model/style");
const { cloudinary } = require("../cloudinary"); // Import Cloudinary configuration and multer upload setup

// Add a new style (public or custom)
exports.addStyle =  
  async (req, res) => {
    try {
      const { title, description, isCustom } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Upload the file to Cloudinary using the memory buffer
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "styles" }, // Cloudinary folder for storing styles
        async (error, result) => {
          if (error) {
            return res.status(500).json({ message: "Upload error", error });
          }

          // Create a new style entry in the database with the image URL from Cloudinary
          const style = new Style({
            title,
            description,
            imageUrl: result.secure_url,
            isCustom: isCustom || false,
            user: req.user ? req.user.userId : null,
          });

          await style.save();
          res.status(201).json({ message: "Style added successfully", style });
        }
      );

      // Pass the buffer from the uploaded file to Cloudinary
      uploadStream.end(req.file.buffer);
    } catch (error) {
      console.log("Error:", error);
      res.status(500).json({ message: "Error adding style", error });
    }
  };

// Fetch all styles (public + user-specific custom styles)
exports.getStyles = async (req, res) => {
  try {
    let publicStyles = await Style.find({ isCustom: false });

    if (req.user) {
      const customStyles = await Style.find({
        user: req.user.userId,
        isCustom: true,
      });
      publicStyles = [...publicStyles, ...customStyles];
    }

    res.status(200).json(publicStyles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching styles", error });
  }
};

// Edit a user's custom style
exports.editCustomStyle = // Handle image upload for style edit
  async (req, res) => {
    try {
      const { styleId } = req.params;
      const { title, description } = req.body;
      const style = await Style.findById(styleId);

      if (!style || style.user.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized to edit this style" });
      }

      // Update style fields
      style.title = title || style.title;
      style.description = description || style.description;

      if (req.file) {
        // Upload the new image to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "styles" },
          async (error, result) => {
            if (error) return res.status(500).json({ message: "Failed to upload image", error });

            style.imageUrl = result.secure_url; // Update with new image URL
            await style.save();
            res.status(200).json({ message: "Style updated successfully", style });
          }
        );

        uploadStream.end(req.file.buffer);
      } else {
        // Save without changing the image
        await style.save();
        res.status(200).json({ message: "Style updated successfully", style });
      }
    } catch (error) {
      console.log("Error:", error);
      res.status(500).json({ message: "Error updating style", error });
    }
  };

// Delete a user's custom style
exports.deleteCustomStyle = async (req, res) => {
  try {
    const { styleId } = req.params;
    const style = await Style.findById(styleId);

    if (!style || style.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized to delete this style" });
    }

    // Delete the image from Cloudinary if it exists
    const publicId = style.imageUrl.split('/').pop().split('.')[0]; // Extract Cloudinary public ID
    await cloudinary.uploader.destroy(`styles/${publicId}`);

    // Delete the style from the database
    await style.deleteOne();
    res.status(200).json({ message: "Style deleted successfully" });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ message: "Error deleting style", error });
  }
};
