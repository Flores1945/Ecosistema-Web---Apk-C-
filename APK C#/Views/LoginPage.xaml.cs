using MiAppAsistencia.Models;
using MiAppAsistencia.Services;

namespace MiAppAsistencia.Views
{
    public partial class LoginPage : ContentPage
    {
        private readonly DataService _dataService;

        public LoginPage()
        {
            InitializeComponent();
            _dataService = new DataService();
        }

        private async void OnLoginClicked(object sender, EventArgs e)
        {
            var correo = CorreoEntry.Text?.Trim();
            var contrasena = ContrasenaEntry.Text?.Trim();

            if (string.IsNullOrWhiteSpace(correo) || string.IsNullOrWhiteSpace(contrasena))
            {
                MostrarError("Por favor, completa todos los campos.");
                return;
            }

            var usuario = _dataService.ValidarUsuario(correo, contrasena);

            if (usuario != null)
            {
                EstadoLabel.IsVisible = false;
                await Navigation.PushAsync(new MainPage(usuario));
            }
            else
            {
                MostrarError("Credenciales incorrectas. Intenta nuevamente.");
            }
        }

        private void MostrarError(string mensaje)
        {
            EstadoLabel.Text = mensaje;
            EstadoLabel.IsVisible = true;
        }
    }
}
