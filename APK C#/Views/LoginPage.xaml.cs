using MiAppAsistencia.Models;
using MiAppAsistencia.Services;

namespace MiAppAsistencia.Views;

public partial class LoginPage : ContentPage
{
    private static readonly Color FieldStrokeStrong = Color.Parse("#94a3b8");
    private static readonly Color FieldStrokeFocused = Color.Parse("#0284c7");

    private readonly DataService _dataService;
    private readonly FirebaseAuthService _authService;

    public LoginPage()
    {
        InitializeComponent();
        _dataService = new DataService();
        _authService = new FirebaseAuthService();

        CorreoEntry.Focused += OnFieldFocused;
        ContrasenaEntry.Focused += OnFieldFocused;
        CorreoEntry.Unfocused += OnFieldUnfocused;
        ContrasenaEntry.Unfocused += OnFieldUnfocused;
    }

    private async void OnLoginClicked(object? sender, EventArgs e)
    {
        var correo = CorreoEntry.Text?.Trim();
        var contrasena = ContrasenaEntry.Text?.Trim();

        if (string.IsNullOrWhiteSpace(correo) || string.IsNullOrWhiteSpace(contrasena))
        {
            MostrarError("Completa todos los campos para continuar.");
            return;
        }

        ErrorBanner.IsVisible = true;
        EstadoLabel.Text = "Verificando credenciales...";

        var sesion = await _authService.IniciarSesionAsync(correo, contrasena);

        if (sesion is null)
        {
            MostrarError("Credenciales incorrectas o sin conexión. Intenta nuevamente.");
            return;
        }

        // Guardar sesión para usar el idToken en llamadas a Firestore/Storage
        Preferences.Set("id_token", sesion.IdToken);
        Preferences.Set("refresh_token", sesion.RefreshToken);
        Preferences.Set("usuario_correo", sesion.Correo);
        Preferences.Set("usuario_nombre", sesion.Nombre);

        ErrorBanner.IsVisible = false;
        await Navigation.PushAsync(new MainPage(sesion.ToUsuario()));
    }

    private void MostrarError(string mensaje)
    {
        EstadoLabel.Text = mensaje;
        ErrorBanner.IsVisible = true;
    }

    private void OnFieldFocused(object? sender, EventArgs e) => SetFieldState(sender, FieldStrokeFocused, 2);

    private void OnFieldUnfocused(object? sender, EventArgs e) => SetFieldState(sender, FieldStrokeStrong, 1);

    private static void SetFieldState(object? sender, Color stroke, double thickness)
    {
        if (sender is not VisualElement element || element.Parent is not Border field)
            return;

        field.Stroke = stroke;
        field.StrokeThickness = thickness;
    }
}
