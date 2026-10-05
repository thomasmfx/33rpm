package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Fornecedor;

public interface FornecedorRepository extends JpaRepository<Fornecedor, Long> {

  Optional<Fornecedor> findByNomeIgnoreCase(String nome);
}
