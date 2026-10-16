// Reference image is framed with CSS. Other images are illustrative demo content.
const photo = (file, caption, alt, reference = false) => ({file, caption, alt, reference});
const collections = {
 croatia: {name: 'Croatia', photos: [
  photo('croatia-coast.jpg', 'Along the Adriatic', 'Coastal village and the blue Mediterranean Sea'),
  photo('croatia-cove.jpg', 'A quiet shore', 'A pale sandy shore beside clear turquoise water'),
  photo('reference.png', 'Brella beach, 2026', 'A quiet pebble beach in Brela with two benches, a blue boat, and the Adriatic Sea under a cloudy sky', true),
  photo('croatia-rocks.jpg', 'Where the sea meets the land', 'Rocky coastline and breaking sea waves'),
  photo('croatia-beach.jpg', 'The last light', 'Soft evening light falling across the coast'),
  photo('croatia-sea.jpg', 'Open water', 'Gentle blue waves stretching toward the horizon')
 ]},
 carpathians: {name: 'The Carpathians', photos: [
  photo('carpathians.jpg', 'Above the clouds', 'Dramatic mountain peaks reaching into the clouds'),
  photo('forest.jpg', 'Into the forest', 'Sunlight filtering through a quiet green forest'),
  photo('mountains.jpg', 'The long way home', 'Layers of distant mountains and an open valley')
 ]},
 italy: {name: 'Italy', photos: [
  photo('italy.jpg', 'Colours of the coast', 'Colourful Italian houses overlooking the sea'),
  photo('venice.jpg', 'An afternoon in Venice', 'Historic Venetian architecture along the water'),
  photo('rome.jpg', 'All roads lead to Rome', 'The ancient architecture of Rome')
 ]},
 macro: {name: 'Macro', photos: [
  photo('macro.jpg', 'A little closer', 'Soft sunlight over small flowers in a meadow'),
  photo('leaves.jpg', 'In the details', 'Rich green leaves and delicate natural textures'),
  photo('flowers.jpg', 'Quiet bloom', 'Delicate pale flowers on branches')
 ]},
 'still-life': {name: 'Still Life', photos: [
  photo('still-life.jpg', 'Everyday poetry', 'A quiet arrangement of everyday objects'),
  photo('flowers.jpg', 'A study in softness', 'A still composition of flowering branches'),
  photo('leaves.jpg', 'Natural forms', 'Sculptural forms of green foliage')
 ]}
};
const frame = document.querySelector('#photo-frame');
const stage = document.querySelector('.photo-stage');
const caption = document.querySelector('#photo-caption');
const count = document.querySelector('#photo-count');
const thumbs = document.querySelector('.thumbnails');
const progress = document.querySelector('.gallery-progress');
const lightbox = document.querySelector('.lightbox');
const collectionButtons = [...document.querySelectorAll('[data-collection]')];
let collection = 'croatia', index = 2, touchStart = null, lastFocused = null;

function makeImage(item) {
 const image = new Image();
 image.src = `./assets/${item.file}`;
 image.alt = item.alt;
 image.draggable = false;
 image.decoding = 'async';
 return image;
}
function fillFrame(container, item) {
 container.classList.toggle('reference-crop', item.reference);
 container.replaceChildren(makeImage(item));
}
function renderPhoto() {
 const photos = collections[collection].photos, item = photos[index];
 fillFrame(frame, item);
 frame.getAnimations().forEach(animation => animation.cancel());
 if (!matchMedia('(prefers-reduced-motion: reduce)').matches) frame.animate([{opacity: .45}, {opacity: 1}], {duration: 260});
 caption.textContent = item.caption;
 count.textContent = `${index + 1}/${photos.length}`;
 [...thumbs.children].forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
 [...progress.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
 if (lightbox.open) renderLightbox();
 const nextImage = new Image();
 nextImage.src = `./assets/${photos[(index + 1) % photos.length].file}`;
}
function selectPhoto(nextIndex) {
 const length = collections[collection].photos.length;
 index = (nextIndex + length) % length;
 renderPhoto();
}
function renderCollection() {
 const current = collections[collection];
 collectionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.collection === collection)));
 document.querySelector('.gallery').setAttribute('aria-label', `${current.name} photographs`);
 thumbs.setAttribute('aria-label', `${current.name} photo thumbnails`);
 thumbs.replaceChildren(); progress.replaceChildren();
 current.photos.forEach((item, i) => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'thumbnail';
  button.setAttribute('aria-label', `View photograph ${i + 1}: ${item.caption}`);
  button.title = item.caption;
  const imageContainer = document.createElement('div');
  imageContainer.className = 'thumbnail-image';
  fillFrame(imageContainer, item);
  imageContainer.querySelector('img').alt = '';
  button.append(imageContainer);
  button.addEventListener('click', () => selectPhoto(i));
  thumbs.append(button);
  const marker = document.createElement('button');
  marker.type = 'button'; marker.setAttribute('aria-label', `Go to photograph ${i + 1}`);
  marker.addEventListener('click', () => selectPhoto(i)); progress.append(marker);
 });
 thumbs.scrollLeft = 0; renderPhoto();
}
collectionButtons.forEach(button => button.addEventListener('click', () => {
 if (collection === button.dataset.collection) return;
 collection = button.dataset.collection; index = 0; renderCollection();
}));
function renderLightbox() {
 const item = collections[collection].photos[index];
 fillFrame(lightbox.querySelector('.lightbox-frame'), item);
 lightbox.querySelector('figcaption').textContent = `${item.caption} · ${index + 1}/${collections[collection].photos.length}`;
}
function openLightbox() {
 lastFocused = document.activeElement; renderLightbox(); lightbox.showModal();
}
document.querySelector('.previous').addEventListener('click', () => selectPhoto(index - 1));
document.querySelector('.next').addEventListener('click', () => selectPhoto(index + 1));
document.querySelector('.expand-button').addEventListener('click', openLightbox);
document.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
document.querySelector('.lightbox-prev').addEventListener('click', () => selectPhoto(index - 1));
document.querySelector('.lightbox-next').addEventListener('click', () => selectPhoto(index + 1));
frame.addEventListener('click', openLightbox);
lightbox.addEventListener('click', event => {if (event.target === lightbox) lightbox.close();});
lightbox.addEventListener('close', () => lastFocused?.focus());
document.addEventListener('keydown', event => {
 if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
 if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
  event.preventDefault(); selectPhoto(index + (event.key === 'ArrowRight' ? 1 : -1));
 }
 if (event.key === 'Enter' && event.target === stage) openLightbox();
});
stage.addEventListener('touchstart', event => {
 touchStart = {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY};
}, {passive: true});
stage.addEventListener('touchend', event => {
 if (!touchStart) return;
 const dx = event.changedTouches[0].clientX - touchStart.x, dy = event.changedTouches[0].clientY - touchStart.y;
 if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) selectPhoto(index + (dx < 0 ? 1 : -1));
 touchStart = null;
}, {passive: true});
renderCollection();
