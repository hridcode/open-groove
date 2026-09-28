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
const albumArtistClear = $("#album-artist-clear");
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
const songArtistClear = $("#song-artist-clear");
const songFile = $("#song-file");
const songAlbum = $("#song-album");
const songPush = $("#song-push");
let songArtists = [];
let songs = [];

const uploadData = $("#upload-data");

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }

    return null;
}

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
        releaseTd.textContent = album.release;
        
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
        release: (new Date(albumRelease.valueAsNumber)).toLocaleDateString(),
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

albumArtistClear.addEventListener("click", () => {
    albumArtists = [];
    albumArtistList.textContent = "None";
    albumArtist.value = "";
})

function updateSongs() {
    songBody.innerHTML = "";

    for (let song of songs) {
        const newTr = document.createElement("tr");
        const nameTd = document.createElement("td");
        const artistsTd = document.createElement("td");
        const fileTd = document.createElement("td");
        const albumTd = document.createElement("td");

        const coverImg = document.createElement("img");

        nameTd.textContent = song.name;
        artistsTd.textContent = song.artists.join(", ");

        const file = fileSelector.files[song.file];
        fileTd.textContent = `${file.name} (${(file.size / 1000000).toFixed(2)} MB)`;
        
        const album = albums[song.album];
        albumTd.textContent = `${album.artists.join(", ")} - ${album.name}`;

        newTr.appendChild(nameTd);
        newTr.appendChild(artistsTd);
        newTr.appendChild(fileTd);
        newTr.appendChild(albumTd);

        songBody.appendChild(newTr);
    }
}

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
        file: +songFile.value,
        album: +songAlbum.value
    });

    updateSongs();
})

songArtistAdd.addEventListener("click", () => {
    songArtists.push(songArtist.value.trim());
    songArtistList.textContent = songArtists.join(", ");
    songArtist.value = "";
})

songArtistClear.addEventListener("click", () => {
    songArtists = [];
    songArtistList.textContent = "None";
    songArtist.value = "";
})

uploadData.addEventListener("click", async () => {
    const formData = new FormData();

    formData.append("csrf_token", getCookie("csrf_access_token"));

    for (const file of fileSelector.files) {
        formData.append("file", file);
    }

    formData.append("metadata", JSON.stringify({
        albums: albums,
        songs: songs
    }));

    const request = await fetch("/media", {
        method: "POST",
        body: formData
    });

    const response = await request.json();

    alert(response.message);
})

$a(".modal-close").forEach(element => {
    const modal = element.closest(".modal")
    element.onclick = () => modal.style.display = "none";
    albumArtists = [];
    albumArtistList.textContent = "";
    clearModal(modal);
});