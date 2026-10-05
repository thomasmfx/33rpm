package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Formato;

public interface FormatoRepository extends JpaRepository<Formato, Long> {

  Optional<Formato> findByNomeIgnoreCase(String nome);
}
