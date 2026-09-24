package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/** RNF0031 e RNF0032: a mesma regra de senha para cliente e administrador. */
@Component
public class RegrasSenha {

  /** RNF0031: mínimo de 8 caracteres, maiúsculas, minúsculas e caractere especial. */
  private static final Pattern SENHA_FORTE =
      Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\W).{8,}$");

  public List<String> validar(String senha, String confirmacao) {
    List<String> erros = new ArrayList<>();
    if (senha == null || senha.isBlank()) {
      erros.add("Informe a senha (RN0026).");
      return erros;
    }
    if (!SENHA_FORTE.matcher(senha).matches()) {
      erros.add("A senha deve ter no mínimo 8 caracteres, letras maiúsculas, "
          + "minúsculas e um caractere especial (RNF0031).");
    }
    if (!senha.equals(confirmacao)) {
      erros.add("As senhas não coincidem (RNF0032).");
    }
    return erros;
  }
}
