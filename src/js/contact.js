function copyEmail() {
    var emailSpan = document.getElementById('email');
    var emailText = emailSpan.innerText;

    navigator.clipboard.writeText(emailText)
      .then(() => {
        alert('L\'adresse e-mail a été copiée dans le presse-papiers : ' + emailText);
      })
      .catch(err => {
        console.error('Impossible de copier l\'adresse e-mail : ', err);
      });
  }