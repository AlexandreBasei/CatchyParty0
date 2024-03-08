   var changePageButton = document.getElementById("submitBtn");

    changePageButton.addEventListener("click", function() {
        event.preventDefault();
        var inputValue = document.getElementById("pseudoInput").value;
        localStorage.setItem("pseudoP1", inputValue);
        window.location.href = "../personalization/personalization.html";
        console.log(document.location.href);
    });
   
   var steps = [
        "Étape 1 : Faites ceci...",
        "Étape 2 : Maintenant, faites cela..."
    ];

    var currentStep = 0;
    var tutorialElement = document.getElementById("tutorial");

    tutorialElement.innerHTML = steps[currentStep];

    function nextStep() {
        currentStep++;
        if (currentStep < steps.length) {
            tutorialElement.innerHTML = steps[currentStep];
            setTimeout(nextStep, 5000);
        }
    }

    function selectAvatar(selectedAvatar) {
        var selectedContainer = document.querySelector('.avatar-selected');
        var avatarImage = selectedAvatar.cloneNode(true);
        selectedContainer.innerHTML = '';
        selectedContainer.appendChild(avatarImage);

        var avatarName = selectedAvatar.alt;
        localStorage.setItem('selectedAvatar', avatarName);

        var options = document.getElementsByClassName('avatar-options');
        options.style.display = 'none';
    }

    setTimeout(nextStep, 5000);