function playersNumber() {
    var selectElement = document.getElementById("nbPlayers");

    for (var i = 1; i <= 10; i++) {
        var option = document.createElement("option");
        option.text = i;
        option.value = i;
        selectElement.appendChild(option);
    }
}
function roundsNumber() {
    var selectElement = document.getElementById("nbRounds");

    for (var i = 1; i <= 3; i++) {
        var option = document.createElement("option");
        option.text = i;
        option.value = i;
        selectElement.appendChild(option);
    }
}
function toggleSelection(element) {
    element.classList.toggle("selected");
}

document.addEventListener("DOMContentLoaded", function() {
    var img = document.getElementById('avatarImg');
    var avatarPath = getAvatar();
    img.src = avatarPath;
    var img = document.getElementById('pseudoPlayer1');
    pseudoText = getPseudo();
    img.textContent = pseudoText;
});

function getAvatar(){
    var avatar = localStorage.getItem('selectedAvatar');
    if(avatar == 'Avatar 1'){
        return '../../assets/Comparaison.png';
    }
    if(avatar == 'Avatar 2'){
        return '../../assets/Realping.png';
    }
    if(avatar == 'Avatar 3'){
        return '../../assets/security.png';
    }
}

function getPseudo(){
    var pseudo = localStorage.getItem('pseudoP1');
    if(!pseudo){
        return 'Randomname';
    }
    else{
        return pseudo;
    }
}

roundsNumber();
playersNumber();