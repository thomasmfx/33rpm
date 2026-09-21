package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Genero;

public interface GeneroRepository extends JpaRepository<Genero, Long> {

  Optional<Genero> findByDescIgnoreCase(String desc);
}
