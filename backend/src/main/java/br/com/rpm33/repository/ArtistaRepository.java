package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Artista;

public interface ArtistaRepository extends JpaRepository<Artista, Long> {

  Optional<Artista> findByNomeIgnoreCase(String nome);
}
