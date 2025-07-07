const fileInput = document.getElementById("file");
const preview = document.getElementById("preview");

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file && file.type.startsWith("image/")) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  });
}

const imageBoxes = document.querySelectorAll(".image-box");
let currentIndex = 0;

function showImage(index) {
  imageBoxes.forEach((box, i) => {
    box.classList.toggle("active", i === index);
  });
}

const prev = document.getElementById("prev");
const next = document.getElementById("next");

if (prev && next) {
  prev.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + imageBoxes.length) % imageBoxes.length;
    showImage(currentIndex);
  });

  next.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % imageBoxes.length;
    showImage(currentIndex);
  });
}
