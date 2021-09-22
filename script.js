const sideBarButton = document.querySelectorAll('.sidebar__button');
const sideNavButtonText = document.querySelectorAll('.btn-text');
const sidebar = document.querySelector('.sidebar');
const sidebarLogo = document.querySelectorAll('.sidebar__logo');
const versionText = document.querySelector('.sidebar__version-text');
const container = document.querySelector('.container');
const alert = document.querySelector('.alert');
const formGroups = document.querySelectorAll('.form__group');

function toggleNav() {
  sidebar.classList.toggle('collapse');
  for (text of sideNavButtonText) {
    text.classList.toggle('hide');
  }
  for (button of sideBarButton) {
    button.classList.toggle('collapse');
  }
  for (logo of sidebarLogo) {
    logo.classList.toggle('hide');
  }
  versionText.classList.toggle('hide');
  container.classList.toggle('collapse');
  console.log(formGroups);
  if (formGroups) {
    for (group of formGroups) {
      group.classList.toggle('hide');
    }
  }
}

function toggleInfoText() {
  alert.classList.toggle('hide');
}
