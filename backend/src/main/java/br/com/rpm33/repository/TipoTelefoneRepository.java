package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.TipoTelefone;

public interface TipoTelefoneRepository extends JpaRepository<TipoTelefone, Long> {

  Optional<TipoTelefone> findByDescIgnoreCase(String desc);
}
