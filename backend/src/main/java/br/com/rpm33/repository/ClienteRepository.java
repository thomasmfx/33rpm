package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import br.com.rpm33.model.Cliente;

public interface ClienteRepository
    extends JpaRepository<Cliente, Long>, JpaSpecificationExecutor<Cliente> {

  Optional<Cliente> findByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

  boolean existsByCpf(String cpf);

  boolean existsByCpfAndIdNot(String cpf, Long id);

  /** RNF0035: numeração do código de cliente. */
  @Query(value = "SELECT nextval('seq_codigo_cliente')", nativeQuery = true)
  Long proximoNumeroDeCodigo();
}
