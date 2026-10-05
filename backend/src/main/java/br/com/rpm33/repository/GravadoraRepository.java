package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Gravadora;

public interface GravadoraRepository extends JpaRepository<Gravadora, Long> {

  Optional<Gravadora> findByNomeIgnoreCase(String nome);
}
