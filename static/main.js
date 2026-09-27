const $ = (selector) => document.querySelector(selector);
const $a = (selector) => document.querySelectorAll(selector);

const fileSelector = $("#file-selector");

const albumTable = $("#album-table");
const albumBody = $("#album-table tbody");
const albumAdd = $("#album-add");
const albumModal = $("#album-modal");
const albumName = $("#album-name");
const albumArtistList = $("#album-artist-list");
const albumArtist = $("#album-artist");
const albumArtistAdd = $("#album-artist-add");
const albumRelease = $("#album-release");
const albumCoverURL = $("#album-cover-url");
const albumPush = $("#album-push");
let albumArtists = [];
let albums = [];

const songTable = $("#song-table");
const songBody = $("#song-table tbody");
const songAdd = $("#song-add");
const songModal = $("#song-modal");
const songName = $("#song-name");
const songAmount = $("#songs-length");
const songArtistList = $("#song-artist-list");
const songArtist = $("#song-artist");
const songArtistAdd = $("#song-artist-add");
const songFile = $("#song-file");
const songAlbum = $("#song-album");
const songPush = $("#song-push");
let songArtists = [];
let songs = [];

const uploadData = $("#upload-data");

albumAdd.addEventListener("click", () => {
    albumModal.style.display = "";
})

songAdd.addEventListener("click", () => {
    updateSongModal();
    songModal.style.display = "";
})

function clearModal(modal) {
    modal.querySelectorAll('input').forEach(element => {
        element.value = "";
    })
}

function updateAlbums() {
    albumBody.innerHTML = "";

    for (let album of albums) {
        const newTr = document.createElement("tr");
        const nameTd = document.createElement("td");
        const artistsTd = document.createElement("td");
        const releaseTd = document.createElement("td");
        const coverTd = document.createElement("td");

        const coverImg = document.createElement("img");

        nameTd.textContent = album.name;
        artistsTd.textContent = album.artists.join(", ");
        releaseTd.textContent = album.releaseDate.toLocaleDateString();
        
        coverImg.src = album.cover;
        coverImg.classList.add("image-cover");

        coverTd.appendChild(coverImg);

        newTr.appendChild(nameTd);
        newTr.appendChild(artistsTd);
        newTr.appendChild(releaseTd);
        newTr.appendChild(coverTd);

        albumBody.appendChild(newTr);
    }
}

albumPush.addEventListener("click", () => {
    if (!albumName.value || albumArtists.length === 0 || !albumCoverURL.checkValidity()) {
        return;
    }

    albums.push({
        name: albumName.value.trim(),
        artists: albumArtists,
        releaseDate: new Date(albumRelease.valueAsNumber),
        cover: albumCoverURL.value
    });

    albumModal.style.display = "none";
    
    albumArtists = [];
    albumArtistList.textContent = "";
    clearModal(albumModal);

    updateAlbums();
})

albumArtistAdd.addEventListener("click", () => {
    albumArtists.push(albumArtist.value.trim());
    albumArtistList.textContent = albumArtists.join(", ");
    albumArtist.value = "";
})

function updateSongs() {}

function updateSongModal() {
    songAmount.textContent = fileSelector.files.length;

    songFile.innerHTML = "";
    songAlbum.innerHTML = "";

    if (fileSelector.files.length > 0) {
        for (let fileIndex in fileSelector.files) {
            const file = fileSelector.files[fileIndex];
            const option = document.createElement("option");
            option.setAttribute("value", fileIndex);
            option.textContent = `${file.name} (${(file.size / 1000000).toFixed(2)} MB)`;
            songFile.appendChild(option);
        }
    }

    for (let albumIndex in albums) {
        const album = albums[albumIndex];
        const option = document.createElement("option");
        option.setAttribute("value", albumIndex);
        option.textContent = `${album.artists.join(", ")} - ${album.name}`;
        songAlbum.appendChild(option);
    }
}

songPush.addEventListener('click', () => {
    if (!songName.value || songArtists.length === 0) {
        return;
    }

    songs.push({
        name: songName.value.trim(),
        artists: songArtists,
        file: fileSelector.files[+songFile.value],
        album: +songAlbum.value
    });

    updateSongs();
})

songArtistAdd.addEventListener("click", () => {
    songArtists.push(songArtist.value.trim());
    songArtistList.textContent = songArtists.join(", ");
    songArtist.value = "";
})

$a(".modal-close").forEach(element => {
    const modal = element.closest(".modal")
    element.onclick = () => modal.style.display = "none";
    albumArtists = [];
    albumArtistList.textContent = "";
    clearModal(modal);
});